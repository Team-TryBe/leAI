"""
PDF Generation Utility for CVs and Cover Letters using reportlab.
"""

import json
from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT


def generate_cv_pdf(cv_data: dict) -> bytes:
    """
    Generate a professional CV PDF from structured CV data.
    Returns PDF content as bytes.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=0.5*inch,
        bottomMargin=0.5*inch,
        leftMargin=0.6*inch,
        rightMargin=0.6*inch
    )
    
    styles = getSampleStyleSheet()
    elements = []
    
    # Custom styles
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=18,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=6,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    contact_style = ParagraphStyle(
        'Contact',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#666666'),
        spaceAfter=8,
        alignment=TA_CENTER,
        leading=11
    )
    
    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=6,
        spaceBefore=8,
        fontName='Helvetica-Bold',
        borderPadding=4
    )
    
    body_style = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontSize=9.5,
        textColor=colors.HexColor('#333333'),
        spaceAfter=3,
        leading=12
    )
    
    entry_title_style = ParagraphStyle(
        'EntryTitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#1a1a1a'),
        fontName='Helvetica-Bold',
        spaceAfter=1
    )
    
    entry_subtitle_style = ParagraphStyle(
        'EntrySubtitle',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#666666'),
        fontName='Helvetica-Oblique',
        spaceAfter=2
    )
    
    # Title
    elements.append(Paragraph(cv_data.get('full_name', 'Untitled'), header_style))
    
    # Contact Info
    contact_info = cv_data.get('contact_info', {})
    contact_parts = []
    if contact_info.get('email'):
        contact_parts.append(contact_info['email'])
    if contact_info.get('phone'):
        contact_parts.append(contact_info['phone'])
    if contact_info.get('location'):
        contact_parts.append(contact_info['location'])
    
    if contact_parts:
        contact_text = " • ".join(contact_parts)
        elements.append(Paragraph(contact_text, contact_style))
    
    # Social Links - ALWAYS INCLUDE (Compulsory)
    social_links = []
    if contact_info.get('linkedin'):
        social_links.append(f'<link href="{contact_info["linkedin"]}" color="blue">LinkedIn</link>')
    if contact_info.get('github'):
        social_links.append(f'<link href="{contact_info["github"]}" color="blue">GitHub</link>')
    if contact_info.get('portfolio'):
        social_links.append(f'<link href="{contact_info["portfolio"]}" color="blue">Portfolio</link>')
    if contact_info.get('twitter'):
        social_links.append(f'<link href="{contact_info["twitter"]}" color="blue">Twitter</link>')
    if contact_info.get('medium'):
        social_links.append(f'<link href="{contact_info["medium"]}" color="blue">Medium</link>')
    
    # Add social links if any exist
    if social_links:
        social_text = " • ".join(social_links)
        elements.append(Paragraph(social_text, contact_style))
    
    elements.append(Spacer(1, 0.15*inch))
    
    # Professional Summary
    if cv_data.get('professional_summary'):
        elements.append(Paragraph("PROFESSIONAL SUMMARY", section_style))
        elements.append(Paragraph(cv_data['professional_summary'], body_style))
        elements.append(Spacer(1, 0.12*inch))
    
    # Experience
    if cv_data.get('experience'):
        elements.append(Paragraph("PROFESSIONAL EXPERIENCE", section_style))
        for exp in cv_data['experience']:
            # Title and Company
            exp_header = f"<b>{exp.get('position', '')}</b> at {exp.get('company', '')}"
            elements.append(Paragraph(exp_header, entry_title_style))
            
            # Duration
            elements.append(Paragraph(exp.get('duration', ''), entry_subtitle_style))
            
            # Achievements
            for achievement in exp.get('achievements', [])[:3]:  # Limit to 3 achievements
                elements.append(Paragraph(f"• {achievement}", body_style))
            
            elements.append(Spacer(1, 0.08*inch))
    
    # Education
    if cv_data.get('education'):
        elements.append(Paragraph("EDUCATION", section_style))
        for edu in cv_data['education']:
            edu_header = f"<b>{edu.get('degree', '')}</b> in {edu.get('field', '')}"
            elements.append(Paragraph(edu_header, entry_title_style))
            elements.append(Paragraph(
                f"{edu.get('institution', '')} | {edu.get('graduation_year', '')}",
                entry_subtitle_style
            ))
            elements.append(Spacer(1, 0.08*inch))
    
    # Skills
    if cv_data.get('skills'):
        elements.append(Paragraph("SKILLS", section_style))
        skills_text = ", ".join(cv_data['skills'])
        elements.append(Paragraph(skills_text, body_style))
        elements.append(Spacer(1, 0.12*inch))
    
    # Certifications
    if cv_data.get('certifications'):
        elements.append(Paragraph("CERTIFICATIONS", section_style))
        for cert in cv_data['certifications']:
            cert_header = f"<b>{cert.get('name', '')}</b>"
            elements.append(Paragraph(cert_header, entry_title_style))
            
            issuer_date = f"{cert.get('issuer', '')} | {cert.get('date', '')}"
            elements.append(Paragraph(issuer_date, entry_subtitle_style))
            
            # Add credential URL/ID if available
            credential_url = cert.get('credential_url') or cert.get('link')
            credential_id = cert.get('credential_id')
            
            if credential_url:
                elements.append(Paragraph(
                    f'<link href="{credential_url}">Verify Credential: {credential_url}</link>',
                    body_style
                ))
            elif credential_id:
                elements.append(Paragraph(
                    f"Credential ID: {credential_id}",
                    body_style
                ))
            
            elements.append(Spacer(1, 0.06*inch))
    
    # Projects
    if cv_data.get('projects'):
        elements.append(Paragraph("PROJECTS", section_style))
        for proj in cv_data['projects'][:2]:  # Limit to 2 projects
            proj_header = f"<b>{proj.get('name', '')}</b>"
            elements.append(Paragraph(proj_header, entry_title_style))
            elements.append(Paragraph(proj.get('description', ''), body_style))
            
            # Add project link if available
            proj_link = proj.get('link') or proj.get('url')
            if proj_link:
                elements.append(Paragraph(
                    f'<link href="{proj_link}">Project Link: {proj_link}</link>',
                    body_style
                ))
            
            tech = ", ".join(proj.get('technologies', []))
            if tech:
                elements.append(Paragraph(f"<i>Tech: {tech}</i>", body_style))
            
            elements.append(Spacer(1, 0.06*inch))
    
    # Referees
    if cv_data.get('referees'):
        elements.append(Paragraph("REFEREES", section_style))
        for ref in cv_data['referees'][:2]:  # Limit to 2 referees
            ref_header = f"<b>{ref.get('name', '')}</b>"
            elements.append(Paragraph(ref_header, entry_title_style))
            elements.append(Paragraph(
                f"{ref.get('title', '')} at {ref.get('organization', '')}",
                entry_subtitle_style
            ))
            ref_contact = f"{ref.get('email', '')} | {ref.get('phone', '')}"
            if ref_contact.strip():
                elements.append(Paragraph(ref_contact, body_style))
            elements.append(Spacer(1, 0.06*inch))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()


def generate_cover_letter_pdf(cover_letter_data: dict, full_name: str) -> bytes:
    """
    Generate a professional cover letter PDF.
    Returns PDF content as bytes.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=0.75*inch,
        bottomMargin=0.75*inch,
        leftMargin=0.75*inch,
        rightMargin=0.75*inch
    )
    
    styles = getSampleStyleSheet()
    elements = []
    
    date_style = ParagraphStyle(
        'Date',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#666666'),
        spaceAfter=20
    )
    
    salutation_style = ParagraphStyle(
        'Salutation',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#333333'),
        spaceAfter=12
    )
    
    body_style = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#333333'),
        spaceAfter=12,
        leading=16,
        alignment=TA_JUSTIFY
    )
    
    closing_style = ParagraphStyle(
        'Closing',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#333333'),
        spaceAfter=8,
        leading=16
    )
    
    signature_style = ParagraphStyle(
        'Signature',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#333333'),
        fontName='Helvetica-Bold'
    )
    
    # Date
    elements.append(Paragraph(datetime.now().strftime("%B %d, %Y"), date_style))
    
    # Cover Letter Content - content already includes salutation, body, and closing
    content = cover_letter_data.get('content', '')
    if content:
        # Split content into paragraphs
        paragraphs = content.split('\n\n')
        for para in paragraphs:
            if para.strip():
                elements.append(Paragraph(para.strip(), body_style))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
