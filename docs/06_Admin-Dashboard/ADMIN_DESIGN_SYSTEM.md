# Admin Pages - Design System Reference

## Provider Color Scheme

### Provider Icons & Colors
```typescript
const PROVIDER_CONFIG = {
  gemini: { 
    label: 'Google Gemini', 
    icon: '🔵', 
    color: 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
  },
  openai: { 
    label: 'OpenAI', 
    icon: '🟢', 
    color: 'bg-green-500/10 border-green-500/30 text-green-400' 
  },
  claude: { 
    label: 'Anthropic Claude', 
    icon: '🟣', 
    color: 'bg-purple-500/10 border-purple-500/30 text-purple-400' 
  },
}
```

---

## Status Badges

### Active/Inactive
```tsx
{provider.is_active && (
  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full">
    Active
  </span>
)}
```

### Test Results
```tsx
{config.last_test_success ? (
  <>
    <Check className="w-3 h-3 text-green-400" />
    <span className="text-green-400">Valid</span>
  </>
) : (
  <>
    <X className="w-3 h-3 text-red-400" />
    <span className="text-red-400">Invalid</span>
  </>
)}
```

---

## Usage Tags

```tsx
{config.default_for_extraction && (
  <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-full">📊 Extract</span>
)}
{config.default_for_cv_draft && (
  <span className="px-2 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-full">📝 CV</span>
)}
{config.default_for_cover_letter && (
  <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-full">✉️ Letter</span>
)}
{config.default_for_validation && (
  <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded-full">✓ Validate</span>
)}
```

---

## Card Layouts

### Compact Provider Card (api-keys page)
```tsx
<div className="bg-brand-dark-bg border border-brand-dark-border hover:border-brand-primary/50 rounded-lg p-4 transition group">
  {/* Header with icon, name, status */}
  {/* Details section with border-t */}
  {/* Action link */}
</div>
```

### Full Provider Card (providers page)
```tsx
<div className={`bg-brand-dark-bg border ${providerConfig.color} rounded-lg p-4 hover:border-brand-primary/50 transition group`}>
  {/* Header: Icon + name + status badge */}
  {/* Details: Model, limits, status */}
  {/* Usage tags */}
  {/* Actions: Test, Edit, Delete buttons */}
</div>
```

---

## Form Layout

### Compact Provider Form (3 rows, 2 columns each)
```tsx
{/* Row 1: Provider Type + Model Name */}
<div className="grid md:grid-cols-2 gap-4">
  {/* Provider select */}
  {/* Model input */}
</div>

{/* Row 2: API Key + Display Name */}
<div className="grid md:grid-cols-2 gap-4">
  {/* API Key input */}
  {/* Display name input */}
</div>

{/* Row 3: Daily Limit + Monthly Limit */}
<div className="grid md:grid-cols-2 gap-4">
  {/* Daily token limit */}
  {/* Monthly token limit */}
</div>

{/* Configuration checkboxes */}
<div className="bg-brand-darker-bg border border-brand-dark-border rounded-lg p-4">
  <div className="grid md:grid-cols-4 gap-3">
    {/* 6 checkbox labels */}
  </div>
</div>
```

---

## Pagination Controls

```tsx
{totalPages > 1 && (
  <div className="flex items-center justify-center gap-2 pt-4">
    {/* Previous Button */}
    <button
      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
      disabled={currentPage === 1}
      className="p-2 rounded-lg border border-brand-dark-border hover:border-brand-primary/50 text-brand-text-muted hover:text-brand-text disabled:opacity-50 disabled:cursor-not-allowed transition"
    >
      <ChevronLeft className="w-4 h-4" />
    </button>

    {/* Page Buttons */}
    <div className="flex items-center gap-1">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <button
          key={page}
          onClick={() => setCurrentPage(page)}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
            currentPage === page
              ? 'bg-brand-primary text-white'
              : 'border border-brand-dark-border text-brand-text-muted hover:border-brand-primary/50'
          }`}
        >
          {page}
        </button>
      ))}
    </div>

    {/* Next Button */}
    <button
      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
      disabled={currentPage === totalPages}
      className="p-2 rounded-lg border border-brand-dark-border hover:border-brand-primary/50 text-brand-text-muted hover:text-brand-text disabled:opacity-50 disabled:cursor-not-allowed transition"
    >
      <ChevronRight className="w-4 h-4" />
    </button>
  </div>
)}
```

---

## Stats Grid

### 2x2 Stats Layout
```tsx
<div className="grid grid-cols-2 gap-2 text-xs">
  <div className="bg-brand-darker-bg rounded-lg p-2">
    <p className="text-brand-text-muted mb-1">API Calls</p>
    <p className="text-base font-bold text-brand-text">{stat.total_calls}</p>
  </div>
  <div className="bg-brand-darker-bg rounded-lg p-2">
    <p className="text-brand-text-muted mb-1">Tokens</p>
    <p className="text-base font-bold text-brand-text">{(stat.total_tokens / 1000).toFixed(0)}K</p>
  </div>
  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2">
    <p className="text-brand-text-muted mb-1">Cost</p>
    <p className="text-base font-bold text-green-400">${stat.total_cost_usd.toFixed(2)}</p>
  </div>
  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2">
    <p className="text-brand-text-muted mb-1">Success</p>
    <p className="text-base font-bold text-blue-400">{stat.success_rate.toFixed(0)}%</p>
  </div>
</div>
```

---

## Button Styles

### Primary Button
```tsx
className="px-6 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg font-medium transition text-sm"
```

### Secondary Button
```tsx
className="px-4 py-2 bg-brand-dark-border hover:bg-brand-dark-border/80 text-brand-text rounded-lg font-medium transition text-sm"
```

### Action Buttons (Small)
```tsx
// Test (Blue)
className="flex-1 px-3 py-2 text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition"

// Edit (Gray)
className="flex-1 px-3 py-2 text-xs bg-brand-dark-border hover:bg-brand-dark-border/80 text-brand-text rounded-lg transition"

// Delete (Red)
className="flex-1 px-3 py-2 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition"
```

---

## Alert Components

### Error Alert
```tsx
<div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg flex items-start gap-3">
  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
  <div>
    <p className="text-brand-text font-medium">Error</p>
    <p className="text-sm text-brand-text-muted mt-1">{error}</p>
  </div>
</div>
```

### Success Alert
```tsx
<div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg flex items-start gap-3">
  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
  <div>
    <p className="text-brand-text font-medium">Success</p>
    <p className="text-sm text-brand-text-muted mt-1">{success}</p>
  </div>
</div>
```

### Info Alert
```tsx
<div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg flex items-start gap-3">
  <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
  <div className="text-sm">
    <p className="text-brand-text font-medium">Viewing active provider configurations</p>
    <p className="text-brand-text-muted mt-1">Additional context here...</p>
  </div>
</div>
```

---

## Empty States

### No Data Empty State
```tsx
<div className="p-12 text-center bg-brand-dark-bg border border-dashed border-brand-dark-border rounded-lg">
  <Zap className="w-12 h-12 text-brand-text-muted mx-auto mb-3 opacity-40" />
  <p className="text-brand-text font-medium mb-1">No Providers Configured</p>
  <p className="text-sm text-brand-text-muted mb-4">Create your first provider to get started</p>
  <button className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg font-medium transition">
    <Plus className="w-4 h-4" />
    Add Provider
  </button>
</div>
```

### Loading State
```tsx
<div className="flex items-center justify-center py-20">
  <div className="text-center">
    <Loader2 className="w-8 h-8 text-brand-primary animate-spin mx-auto mb-3" />
    <p className="text-brand-text-muted">Loading providers...</p>
  </div>
</div>
```

---

## Form Input Styling

### Text Input
```tsx
className="w-full px-3 py-2 bg-brand-darker-bg border border-brand-dark-border rounded-lg text-sm text-brand-text placeholder-gray-600 focus:border-brand-primary outline-none transition"
```

### Select Input
```tsx
className="w-full px-3 py-2 bg-brand-darker-bg border border-brand-dark-border rounded-lg text-sm text-brand-text disabled:opacity-50 focus:border-brand-primary outline-none transition"
```

### Form Labels
```tsx
className="block text-xs font-semibold text-brand-text mb-2 uppercase tracking-wide"
```

### Checkbox
```tsx
className="w-4 h-4 rounded border-brand-dark-border bg-brand-darker-bg cursor-pointer"
```

---

## Responsive Grid System

### 3-Column Grid (Cards)
```tsx
className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
// Mobile: 1 column
// Tablet: 2 columns
// Desktop: 3 columns
```

### 2-Column Form Grid
```tsx
className="grid md:grid-cols-2 gap-4"
// Mobile: 1 column
// Tablet+: 2 columns
```

### Flexible Config Grid
```tsx
className="grid md:grid-cols-4 gap-3"
// Mobile: 1 column (stack vertically)
// Tablet: 2-4 columns depending on content
// Desktop: 4 columns
```

---

## Typography Scale

- **Page Title**: `text-3xl font-bold`
- **Section Title**: `text-xl font-bold`
- **Card Title**: `text-sm font-bold`
- **Form Label**: `text-xs font-semibold uppercase tracking-wide`
- **Body Text**: `text-sm`
- **Small Text**: `text-xs`
- **Code/Monospace**: `font-mono`

---

## Common Tailwind Classes Reference

| Class | Usage |
|-------|-------|
| `bg-brand-dark-bg` | Main background |
| `bg-brand-darker-bg` | Nested background |
| `border-brand-dark-border` | Default borders |
| `text-brand-text` | Primary text |
| `text-brand-text-muted` | Secondary text |
| `bg-brand-primary` | Action buttons |
| `rounded-lg` | Default border radius |
| `gap-4` | Standard spacing |
| `p-4` | Standard padding |
| `transition` | Smooth animations |

---

## Icons Used

- **Zap**: API/Power concept
- **Plus**: Add new item
- **Edit2**: Modify existing item
- **Trash2**: Delete action
- **Check**: Success/Valid status
- **X**: Error/Invalid status
- **RefreshCw**: Test/Reload action
- **Loader2**: Loading state
- **ChevronLeft**: Previous page
- **ChevronRight**: Next page
- **AlertCircle**: Warning/Info alerts
- **Settings**: Configuration
- **ArrowRight**: Navigation CTA
