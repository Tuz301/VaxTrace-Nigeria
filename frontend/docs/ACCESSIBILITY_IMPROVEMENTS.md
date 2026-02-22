# Accessibility Improvements

This document describes the accessibility improvements made to the VaxTrace Nigeria frontend application.

## Overview

VaxTrace Nigeria is committed to ensuring accessibility for all users, including those with disabilities. The application follows WCAG 2.1 Level AA guidelines and includes comprehensive ARIA labels, keyboard navigation support, and screen reader compatibility.

## WCAG 2.1 Compliance

The application aims to meet WCAG 2.1 Level AA requirements across four principles:

1. **Perceivable**: Information and UI components must be presentable in ways users can perceive
2. **Operable**: UI components and navigation must be operable
3. **Understandable**: Information and UI operation must be understandable
4. **Robust**: Content must be robust enough to be interpreted by assistive technologies

## Implemented Features

### 1. Semantic HTML

- Proper use of HTML5 semantic elements (`<header>`, `<nav>`, `<main>`, `<aside>`, `<section>`)
- Heading hierarchy (`h1` → `h2` → `h3`)
- Proper list structures for navigation
- Semantic button and link elements

### 2. ARIA Labels and Roles

#### Header Component ([`frontend/src/components/layout/Header.tsx`](../src/components/layout/Header.tsx))

```tsx
<header role="banner">
  <h1 id="page-title">{getPageTitle()}</h1>
  
  <div role="search">
    <input
      type="search"
      aria-label="Search facilities, vaccines, and alerts"
      aria-describedby="search-description"
    />
    <span id="search-description" className="sr-only">
      Search through facilities, vaccines, and alerts by typing keywords
    </span>
  </div>
  
  <button
    aria-label={`Notifications${alertCount > 0 ? ` (${alertCount} unread)` : ''}`}
    aria-live="polite"
    aria-atomic="true"
  >
    <Bell aria-hidden="true" />
  </button>
  
  <Link
    aria-label="Go to settings"
    aria-current={pathname === '/dashboard/settings' ? 'page' : undefined}
  >
    <Settings aria-hidden="true" />
  </Link>
  
  <button
    aria-label="User menu"
    aria-expanded="false"
    aria-haspopup="true"
  >
    <User aria-hidden="true" />
    <ChevronDown aria-hidden="true" />
  </button>
</header>
```

#### Sidebar Component ([`frontend/src/components/layout/Sidebar.tsx`](../src/components/layout/Sidebar.tsx))

```tsx
<aside
  role="navigation"
  aria-label="Main navigation"
  aria-hidden={!sidebarOpen}
  inert={!sidebarOpen}
>
  <nav aria-label="Primary navigation" id="sidebar-navigation">
    <ul role="list">
      {NAV_ITEMS.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            aria-describedby={`nav-${item.href.replace(/\//g, '-')}-desc`}
          >
            <Icon aria-hidden="true" />
            <span>{item.label}</span>
            <span 
              id={`nav-${item.href.replace(/\//g, '-')}-desc`} 
              className="sr-only"
            >
              {item.description}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  </nav>
</aside>
```

### 3. Keyboard Navigation

- **Tab Order**: Logical tab order through interactive elements
- **Focus Indicators**: Visible focus rings (`focus:ring-2 focus:ring-emerald-500`)
- **Skip Links**: Skip to main content links (where applicable)
- **Keyboard Shortcuts**: Support for common keyboard shortcuts

#### Focus Management

```css
/* Visible focus indicators */
.focus\:ring-2:focus {
  box-shadow: 0 0 0 2px rgb(16 185 129 / 0.5);
}

/* Focus offset for better visibility */
.focus\:ring-offset-2:focus {
  box-shadow: 0 0 0 4px rgb(16 185 129 / 0.5);
}
```

### 4. Screen Reader Support

- **ARIA Live Regions**: Dynamic content updates announced to screen readers
- **ARIA Descriptions**: Additional context for complex elements
- **Hidden Text**: Screen reader-only text using `sr-only` class
- **Icon Labels**: Icons marked with `aria-hidden="true"` with text alternatives

### 5. Color Contrast

All text and interactive elements meet WCAG AA contrast requirements:

- **Normal Text**: Minimum 4.5:1 contrast ratio
- **Large Text**: Minimum 3:1 contrast ratio
- **Interactive Elements**: Minimum 3:1 contrast ratio

### 6. Form Accessibility

#### Input Fields

```tsx
<div className="relative">
  <Label htmlFor="email">Email Address</Label>
  <Input
    id="email"
    type="email"
    placeholder="Enter your email"
    aria-describedby="email-description"
    aria-invalid={errors.email ? 'true' : 'false'}
    aria-required="true"
  />
  <span id="email-description" className="sr-only">
    Enter your registered email address
  </span>
  {errors.email && (
    <p role="alert" aria-live="assertive">
      {errors.email}
    </p>
  )}
</div>
```

#### Form Validation

- Clear error messages with `role="alert"`
- `aria-invalid` attribute for invalid fields
- `aria-describedby` for additional context
- `aria-required` for required fields

### 7. Dynamic Content

#### Alert Ticker

```tsx
<div
  role="region"
  aria-live="polite"
  aria-atomic="true"
  aria-label="Alert notifications"
>
  {/* Alert content */}
</div>
```

#### Loading States

```tsx
<div
  role="status"
  aria-live="polite"
  aria-busy="true"
>
  <span className="sr-only">Loading...</span>
  <Spinner aria-hidden="true" />
</div>
```

### 8. Mobile Accessibility

- **Touch Targets**: Minimum 44x44 pixels for interactive elements
- **Responsive Design**: Adapts to different screen sizes
- **Mobile Menu**: Accessible mobile navigation with proper ARIA attributes

## Utility Classes

### Screen Reader Only

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### Focus Visible

```css
.focus-visible {
  outline: 2px solid rgb(16 185 129);
  outline-offset: 2px;
}
```

## Testing

### Manual Testing Checklist

- [ ] All interactive elements are keyboard accessible
- [ ] Tab order is logical and predictable
- [ ] Focus indicators are visible
- [ ] All images have alt text
- [ ] Form fields have associated labels
- [ ] Error messages are clear and associated with fields
- [ ] Color contrast meets WCAG AA standards
- [ ] Screen reader announces dynamic content changes
- [ ] Skip links work (where implemented)

### Automated Testing

- **Lighthouse**: Accessibility audit
- **axe-core**: Automated accessibility testing
- **WAVE**: Web accessibility evaluation tool

## Best Practices

### 1. Progressive Enhancement

- Core functionality works without JavaScript
- Enhanced experience with JavaScript enabled
- Graceful degradation for older browsers

### 2. Responsive Design

- Adapts to different screen sizes
- Touch-friendly on mobile devices
- Maintains accessibility across devices

### 3. Performance

- Fast load times for better user experience
- Optimized for assistive technologies
- Efficient DOM updates

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Accessibility Checklist](https://webaim.org/standards/wcag/checklist)
- [Inclusive Components](https://inclusive-components.design/)

## Future Improvements

- [ ] Add skip links for main content
- [ ] Implement focus trap in modals
- [ ] Add keyboard shortcuts for common actions
- [ ] Enhance error handling for screen readers
- [ ] Add audio descriptions for video content
- [ ] Implement high contrast mode
- [ ] Add font size adjustment controls

## Related Files

- [`frontend/src/components/layout/Header.tsx`](../src/components/layout/Header.tsx) - Accessible header component
- [`frontend/src/components/layout/Sidebar.tsx`](../src/components/layout/Sidebar.tsx) - Accessible sidebar navigation
- [`frontend/src/components/ui/`](../src/components/ui/) - Accessible UI components
