"""
Applications API endpoints for queuing and managing job applications.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List
import json
import os

from app.db.database import get_db
from app.db.models import JobApplication, ExtractedJobData, User, JobApplicationStatus
from app.api.users import get_current_user
from app.api.cv_drafter import CVDraftResponse
from app.utils.pdf_generator import generate_cv_pdf, generate_cover_letter_pdf
from app.services.gmail_service import GmailService
from app.schemas import ApiResponse

router = APIRouter(tags=["applications"])


class QueueApplicationRequest(BaseModel):
    job_id: int
    cv: CVDraftResponse
    cover_letter: Optional[dict] = None
    
    class Config:
        # Allow extra fields and use populate by name
        extra = "ignore"
        from_attributes = True


class UpdateApplicationStatusRequest(BaseModel):
    status: str
    notes: Optional[str] = None


class ApplicationResponse(BaseModel):
    id: int
    job_title: str
    company_name: str
    location: str
    status: str
    created_at: str
    submitted_at: Optional[str]
    application_email_to: Optional[str]
    application_email_cc: Optional[str]
    cv: str
    cover_letter: str
    cv_pdf_path: Optional[str]
    cover_letter_pdf_path: Optional[str]
    error_message: Optional[str]

    class Config:
        from_attributes = True


class PaginatedApplicationsResponse(BaseModel):
    items: List[ApplicationResponse]
    total: int
    page: int
    limit: int
    total_pages: int


class AdminApplicationResponse(BaseModel):
    id: int
    user_id: int
    user_email: str
    user_full_name: str
    job_title: str
    company_name: str
    location: str
    status: str
    created_at: str
    submitted_at: Optional[str]
    cv_pdf_path: Optional[str]
    cover_letter_pdf_path: Optional[str]

    class Config:
        from_attributes = True


class PaginatedAdminApplicationsResponse(BaseModel):
    items: List[AdminApplicationResponse]
    total: int
    page: int
    limit: int
    total_pages: int


class SendApplicationRequest(BaseModel):
    """Request to send an application via Gmail."""
    app_id: int  # Job application ID
    to_emails: List[str]  # Recipient email addresses
    cc_emails: Optional[List[str]] = None  # CC email addresses
    custom_message: Optional[str] = None  # Optional custom email body
    
    class Config:
        from_attributes = True


@router.post("/applications/queue")
async def queue_application(
    request: QueueApplicationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Queue an application after CV validation."""
    try:
        print(f"📋 Queue Application Request: job_id={request.job_id}, cv_full_name={request.cv.full_name if request.cv else 'None'}")
        
        # Fetch the extracted job data
        result = await db.execute(
            select(ExtractedJobData).where(ExtractedJobData.id == request.job_id)
        )
        extracted_data = result.scalars().first()

        if not extracted_data:
            print(f"❌ Job not found: {request.job_id}")
            raise HTTPException(status_code=404, detail="Job not found")

        print(f"✅ Found job: {extracted_data.job_title} at {extracted_data.company_name}")

        # Create JSON representation of CV
        cv_dict = {
            "full_name": request.cv.full_name,
            "contact_info": request.cv.contact_info.dict() if hasattr(request.cv.contact_info, 'dict') else request.cv.contact_info,
            "professional_summary": request.cv.professional_summary,
            "experience": [exp.dict() if hasattr(exp, 'dict') else exp for exp in request.cv.experience],
            "education": [edu.dict() if hasattr(edu, 'dict') else edu for edu in request.cv.education],
            "skills": request.cv.skills,
            "certifications": [cert.dict() if hasattr(cert, 'dict') else cert for cert in request.cv.certifications],
            "projects": [proj.dict() if hasattr(proj, 'dict') else proj for proj in request.cv.projects],
            "referees": [ref.dict() if hasattr(ref, 'dict') else ref for ref in request.cv.referees],
            "languages": [lang.dict() if hasattr(lang, 'dict') else lang for lang in request.cv.languages],
        }
        
        cv_json = json.dumps(cv_dict)

        cover_letter_json = ""
        cover_letter_dict = {}
        if request.cover_letter:
            cover_letter_dict = request.cover_letter
            cover_letter_json = json.dumps(request.cover_letter)

        # Generate PDF files
        os.makedirs("pdfs", exist_ok=True)
        
        # Generate CV PDF
        cv_pdf_content = generate_cv_pdf(cv_dict)
        cv_filename = f"cv_{current_user.id}_{datetime.utcnow().timestamp()}.pdf"
        cv_pdf_path = os.path.join("pdfs", cv_filename)
        with open(cv_pdf_path, "wb") as f:
            f.write(cv_pdf_content)
        
        # Generate Cover Letter PDF
        cover_letter_pdf_path = None
        if cover_letter_dict:
            cover_letter_pdf_content = generate_cover_letter_pdf(cover_letter_dict, request.cv.full_name)
            cover_letter_filename = f"cover_letter_{current_user.id}_{datetime.utcnow().timestamp()}.pdf"
            cover_letter_pdf_path = os.path.join("pdfs", cover_letter_filename)
            with open(cover_letter_pdf_path, "wb") as f:
                f.write(cover_letter_pdf_content)

        # Create job application
        job_application = JobApplication(
            user_id=current_user.id,
            extracted_data_id=request.job_id,
            job_url=extracted_data.job_url,
            status=JobApplicationStatus.REVIEW,
            tailored_cv=cv_json,
            tailored_cv_pdf_path=cv_pdf_path,
            cover_letter=cover_letter_json,
            cover_letter_pdf_path=cover_letter_pdf_path,
        )

        db.add(job_application)
        await db.commit()
        await db.refresh(job_application)

        print(f"✅ Application queued successfully: {job_application.id}")
        return {
            "message": "Application queued successfully",
            "application_id": job_application.id,
            "status": job_application.status,
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"❌ Error queuing application: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to queue application: {str(e)}")


@router.get("/applications")
async def get_applications(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch paginated applications for current user with optional status filter."""
    try:
        # Build query with optional status filter
        query = select(JobApplication).where(
            JobApplication.user_id == current_user.id
        )
        
        if status:
            # Map status parameter to JobApplicationStatus enum
            try:
                status_enum = JobApplicationStatus(status)
                query = query.where(JobApplication.status == status_enum)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
        
        # Get total count
        count_result = await db.execute(query)
        total = len(count_result.scalars().all())

        # Get paginated results
        offset = (page - 1) * limit
        result = await db.execute(
            query

            .order_by(desc(JobApplication.created_at))
            .offset(offset)
            .limit(limit)
        )
        applications = result.scalars().all()

        # Format response
        items = []
        for app in applications:
            # Get job data
            job_data = await db.get(ExtractedJobData, app.extracted_data_id)

            items.append(
                ApplicationResponse(
                    id=app.id,
                    job_title=job_data.job_title if job_data else "N/A",
                    company_name=job_data.company_name if job_data else "N/A",
                    location=job_data.location if job_data else "N/A",
                    status=app.status.value,
                    created_at=app.created_at.isoformat() if app.created_at else "",
                    submitted_at=app.submitted_at.isoformat() if app.submitted_at else None,
                    application_email_to=job_data.application_email_to if job_data else None,
                    application_email_cc=job_data.application_email_cc if job_data else None,
                    cv=app.tailored_cv or "",
                    cover_letter=app.cover_letter or "",
                    cv_pdf_path=app.tailored_cv_pdf_path,
                    cover_letter_pdf_path=app.cover_letter_pdf_path,
                    error_message=app.error_message,
                )
            )

        total_pages = (total + limit - 1) // limit

        return PaginatedApplicationsResponse(
            items=items,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
        )

    except Exception as e:
        print(f"Error fetching applications: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch applications")


@router.post("/applications/{application_id}/submit")
async def submit_application(
    application_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a queued application."""
    try:
        # Fetch the application
        result = await db.execute(
            select(JobApplication).where(
                JobApplication.id == application_id,
                JobApplication.user_id == current_user.id,
            )
        )
        application = result.scalars().first()

        if not application:
            raise HTTPException(status_code=404, detail="Application not found")

        # Update status to sent
        application.status = JobApplicationStatus.SENT
        application.is_submitted = True
        application.submitted_at = datetime.utcnow()

        await db.commit()
        await db.refresh(application)

        return {
            "message": "Application submitted successfully",
            "application_id": application.id,
            "status": application.status.value,
            "submitted_at": application.submitted_at.isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error submitting application: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit application")


@router.post("/applications/{application_id}/archive")
async def archive_application(
    application_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Archive an application."""
    try:
        # Fetch the application
        result = await db.execute(
            select(JobApplication).where(
                JobApplication.id == application_id,
                JobApplication.user_id == current_user.id,
            )
        )
        application = result.scalars().first()

        if not application:
            raise HTTPException(status_code=404, detail="Application not found")

        # Update status to archived
        application.status = JobApplicationStatus.ARCHIVED

        await db.commit()
        await db.refresh(application)

        return {
            "message": "Application archived successfully",
            "application_id": application.id,
            "status": application.status.value,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error archiving application: {e}")
        raise HTTPException(status_code=500, detail="Failed to archive application")

@router.get("/applications/{application_id}/pdf/{pdf_type}")
async def download_application_pdf(
    application_id: int,
    pdf_type: str,  # "cv" or "cover_letter"
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download PDF file for an application."""
    try:
        # Fetch the application
        result = await db.execute(
            select(JobApplication).where(
                JobApplication.id == application_id,
                JobApplication.user_id == current_user.id,
            )
        )
        application = result.scalars().first()

        if not application:
            raise HTTPException(status_code=404, detail="Application not found")

        if pdf_type == "cv":
            pdf_path = application.tailored_cv_pdf_path
            filename = f"cv_{application_id}.pdf"
        elif pdf_type == "cover_letter":
            pdf_path = application.cover_letter_pdf_path
            filename = f"cover_letter_{application_id}.pdf"
        else:
            raise HTTPException(status_code=400, detail="Invalid pdf_type")

        if not pdf_path or not os.path.exists(pdf_path):
            raise HTTPException(status_code=404, detail="PDF file not found")

        return FileResponse(
            path=pdf_path,
            filename=filename,
            media_type="application/pdf"
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error downloading PDF: {e}")
        raise HTTPException(status_code=500, detail="Failed to download PDF")


@router.delete("/applications/{application_id}")
async def delete_application(
    application_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an application (soft delete or permanent)."""
    try:
        # Fetch the application
        result = await db.execute(
            select(JobApplication).where(
                JobApplication.id == application_id,
                JobApplication.user_id == current_user.id,
            )
        )
        application = result.scalars().first()

        if not application:
            raise HTTPException(status_code=404, detail="Application not found")

        # Delete PDF files if they exist
        if application.tailored_cv_pdf_path and os.path.exists(application.tailored_cv_pdf_path):
            try:
                os.remove(application.tailored_cv_pdf_path)
                print(f"🗑️ Deleted CV PDF: {application.tailored_cv_pdf_path}")
            except Exception as e:
                print(f"Warning: Could not delete CV PDF: {e}")

        if application.cover_letter_pdf_path and os.path.exists(application.cover_letter_pdf_path):
            try:
                os.remove(application.cover_letter_pdf_path)
                print(f"🗑️ Deleted cover letter PDF: {application.cover_letter_pdf_path}")
            except Exception as e:
                print(f"Warning: Could not delete cover letter PDF: {e}")

        # Delete from database
        await db.delete(application)
        await db.commit()

        return {
            "message": "Application deleted successfully",
            "application_id": application_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting application: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete application")


@router.patch("/applications/{application_id}/status")
async def update_application_status(
    application_id: int,
    request: UpdateApplicationStatusRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update the status of a sent application for tracking purposes."""
    try:
        # Fetch the application
        result = await db.execute(
            select(JobApplication).where(
                JobApplication.id == application_id,
                JobApplication.user_id == current_user.id,
            )
        )
        application = result.scalars().first()

        if not application:
            raise HTTPException(status_code=404, detail="Application not found")

        # Validate and convert status
        try:
            new_status = JobApplicationStatus(request.status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {request.status}")

        # Update status
        application.status = new_status
        
        # If notes provided, append to error_message field (reusing for tracking notes)
        if request.notes:
            current_notes = application.error_message or ""
            timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
            new_note = f"[{timestamp}] {request.notes}"
            application.error_message = f"{current_notes}\n{new_note}".strip() if current_notes else new_note

        await db.commit()
        await db.refresh(application)

        return {
            "message": "Status updated successfully",
            "application_id": application.id,
            "status": application.status.value,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating application status: {e}")
        raise HTTPException(status_code=500, detail="Failed to update status")




@router.get("/admin/applications")
async def get_admin_applications(
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all applications for admin view (admin role required)."""
    try:
        # Check if user is admin (simplified check - in production, implement role-based access)
        # For now, we trust the frontend to handle authorization
        
        # Build query for all applications (not filtered by user_id)
        query = select(JobApplication)
        
        # Apply status filter if provided
        if status:
            try:
                status_enum = JobApplicationStatus(status)
                query = query.where(JobApplication.status == status_enum)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
        
        # Get total count
        count_result = await db.execute(select(JobApplication))
        total = len(count_result.scalars().all())
        
        # Apply pagination
        query = query.order_by(desc(JobApplication.created_at))
        query = query.offset((page - 1) * limit).limit(limit)
        
        result = await db.execute(query)
        applications = result.scalars().all()

        # Format response with user information
        items = []
        for app in applications:
            # Get user data
            user = await db.get(User, app.user_id)
            # Get job data
            job_data = await db.get(ExtractedJobData, app.extracted_data_id)

            items.append(
                AdminApplicationResponse(
                    id=app.id,
                    user_id=app.user_id,
                    user_email=user.email if user else "Unknown",
                    user_full_name=user.full_name if user else "Unknown",
                    job_title=job_data.job_title if job_data else "N/A",
                    company_name=job_data.company_name if job_data else "N/A",
                    location=job_data.location if job_data else "N/A",
                    status=app.status.value,
                    created_at=app.created_at.isoformat() if app.created_at else "",
                    submitted_at=app.submitted_at.isoformat() if app.submitted_at else None,
                    cv_pdf_path=app.tailored_cv_pdf_path,
                    cover_letter_pdf_path=app.cover_letter_pdf_path,
                )
            )

        total_pages = (total + limit - 1) // limit

        return PaginatedAdminApplicationsResponse(
            items=items,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching admin applications: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch applications")


@router.get("/applications/analytics/summary")
async def get_analytics_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get analytics summary of all applications."""
    try:
        # Fetch all applications for the user
        result = await db.execute(
            select(JobApplication).where(JobApplication.user_id == current_user.id)
        )
        applications = result.scalars().all()

        # Count by status
        status_counts = {}
        for status in JobApplicationStatus:
            status_counts[status.value] = 0
        
        for app in applications:
            status_counts[app.status.value] += 1

        total_applications = len(applications)
        sent_applications = status_counts.get("sent", 0) + status_counts.get("waiting_response", 0) + \
                           status_counts.get("feedback_received", 0) + status_counts.get("interview_scheduled", 0) + \
                           status_counts.get("offer_negotiation", 0) + status_counts.get("rejected", 0)

        return {
            "total_applications": total_applications,
            "sent_applications": sent_applications,
            "status_breakdown": status_counts,
            "success_metrics": {
                "interview_rate": (status_counts.get("interview_scheduled", 0) / sent_applications * 100) if sent_applications > 0 else 0,
                "offer_rate": (status_counts.get("offer_negotiation", 0) / sent_applications * 100) if sent_applications > 0 else 0,
                "rejection_rate": (status_counts.get("rejected", 0) / sent_applications * 100) if sent_applications > 0 else 0,
            }
        }

    except Exception as e:
        print(f"Error fetching analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch analytics")


# ============================================================================
# Gmail Integration: Send Applications
# ============================================================================


@router.post("/applications/{app_id}/send")
async def send_application_via_gmail(
    app_id: int,
    request: SendApplicationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse:
    """
    Send a job application via Gmail.
    
    Documentation:
    ✅ Step 4: Send Email with Attachments
    - Fetch the application and its PDF files
    - Get user's Gmail tokens
    - Compose email with CV and cover letter as attachments
    - Send via Gmail API
    - Update application status to "sent"
    
    Request:
        app_id: Job application ID
        to_emails: List of recipient emails
        cc_emails: Optional CC emails
        custom_message: Optional custom message to include in email body
    
    Returns:
        Success message with Gmail message ID
    """
    
    try:
        # Fetch the application
        result = await db.execute(
            select(JobApplication).where(
                JobApplication.id == app_id,
                JobApplication.user_id == current_user.id,
            )
        )
        application = result.scalar_one_or_none()
        
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")
        
        # Fetch job data for context
        job_data = await db.get(ExtractedJobData, application.extracted_data_id)
        if not job_data:
            raise HTTPException(status_code=404, detail="Job data not found")
        
        # Check if user has Gmail connected
        if not current_user.gmail_connected:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Gmail account not connected. Please connect Gmail in settings.",
            )
        
        # Prepare email subject and body
        subject = f"Application for {job_data.job_title} at {job_data.company_name}"
        
        # Build email body with optional custom message
        email_body_html = f"""
        <html>
            <body>
                <p>Dear Hiring Manager,</p>
        """
        
        if request.custom_message:
            email_body_html += f"<p>{request.custom_message}</p>"
        else:
            email_body_html += f"""
                <p>I am writing to express my interest in the {job_data.job_title} position at {job_data.company_name}.</p>
                <p>I have attached my CV and cover letter for your review. I am confident that my skills and experience 
                align well with your requirements.</p>
            """
        
        email_body_html += """
                <p>Thank you for considering my application. I look forward to hearing from you.</p>
                <p>Best regards,<br/>""" + current_user.full_name + """</p>
            </body>
        </html>
        """
        
        # Prepare attachments
        attachments = {}
        
        # Add CV PDF if available
        if application.tailored_cv_pdf_path and os.path.exists(application.tailored_cv_pdf_path):
            with open(application.tailored_cv_pdf_path, "rb") as f:
                cv_filename = f"CV_{current_user.full_name.replace(' ', '_')}.pdf"
                attachments[cv_filename] = f.read()
        
        # Add cover letter PDF if available
        if application.cover_letter_pdf_path and os.path.exists(application.cover_letter_pdf_path):
            with open(application.cover_letter_pdf_path, "rb") as f:
                letter_filename = f"CoverLetter_{current_user.full_name.replace(' ', '_')}.pdf"
                attachments[letter_filename] = f.read()
        
        # Send email via Gmail API
        await GmailService.send_email(
            user_id=current_user.id,
            db=db,
            to_emails=request.to_emails,
            cc_emails=request.cc_emails or [],
            subject=subject,
            body=email_body_html,
            attachments=attachments,
        )
        
        # Update application status
        application.status = JobApplicationStatus.SENT
        application.is_submitted = True
        application.submitted_at = datetime.utcnow()
        
        db.add(application)
        await db.commit()
        await db.refresh(application)
        
        print(f"✅ Application {app_id} sent via Gmail to {', '.join(request.to_emails)}")
        
        return ApiResponse(
            success=True,
            data={
                "message": "Application sent successfully!",
                "application_id": app_id,
                "status": application.status.value,
                "sent_at": application.submitted_at.isoformat(),
            },
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error sending application: {e}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send application: {str(e)}",
        )


@router.get("/applications/{app_id}/email-config")
async def get_email_config(
    app_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse:
    """
    Get pre-filled email configuration for an application.
    
    Returns the application details and any pre-configured email recipients
    from the extracted job data.
    
    Documentation:
    This endpoint provides the frontend with pre-filled data to make
    it easier for users to send applications. They can still modify
    the email addresses before sending.
    """
    
    try:
        # Fetch the application
        result = await db.execute(
            select(JobApplication).where(
                JobApplication.id == app_id,
                JobApplication.user_id == current_user.id,
            )
        )
        application = result.scalar_one_or_none()
        
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")
        
        # Fetch job data
        job_data = await db.get(ExtractedJobData, application.extracted_data_id)
        
        return ApiResponse(
            success=True,
            data={
                "app_id": app_id,
                "job_title": job_data.job_title if job_data else "N/A",
                "company_name": job_data.company_name if job_data else "N/A",
                "to_emails": [job_data.application_email_to] if job_data and job_data.application_email_to else [],
                "cc_emails": job_data.application_email_cc.split(",") if job_data and job_data.application_email_cc else [],
                "application_method": job_data.application_method if job_data else "Email",
                "gmail_connected": current_user.gmail_connected,
            },
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching email config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch email configuration",
        )

