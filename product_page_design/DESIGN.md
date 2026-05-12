---
name: Premium Tech Commerce
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#40484b'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#70787c'
  outline-variant: '#c0c8cb'
  surface-tint: '#306576'
  primary: '#003441'
  on-primary: '#ffffff'
  primary-container: '#0f4c5c'
  on-primary-container: '#87bbce'
  inverse-primary: '#9acee1'
  secondary: '#006a62'
  on-secondary: '#ffffff'
  secondary-container: '#70f8e8'
  on-secondary-container: '#007168'
  tertiary: '#66000f'
  on-tertiary: '#ffffff'
  tertiary-container: '#90001a'
  on-tertiary-container: '#ff9693'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b6ebfe'
  primary-fixed-dim: '#9acee1'
  on-primary-fixed: '#001f28'
  on-primary-fixed-variant: '#114d5d'
  secondary-fixed: '#70f8e8'
  secondary-fixed-dim: '#4fdbcc'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#ffdad8'
  tertiary-fixed-dim: '#ffb3b0'
  on-tertiary-fixed: '#410006'
  on-tertiary-fixed-variant: '#93001a'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  price-display:
    fontFamily: Hanken Grotesk
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 24px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-desktop: 48px
  margin-mobile: 16px
  stack-sm: 4px
  stack-md: 12px
  stack-lg: 24px
---

## Brand & Style

This design system is built on a foundation of **Modern Corporate** aesthetics, specifically tailored for a premium high-quality electronics retail experience. The visual language balances precision with accessibility, ensuring that technical specifications are easy to digest while maintaining an upscale, trustworthy atmosphere.

The brand personality is "The Reliable Expert"—knowledgeable and professional, yet never cold. The interface utilizes generous whitespace (negative space) to reduce cognitive load, allowing product imagery to serve as the primary focal point. Subtle high-end details, such as micro-interactions and refined typography, differentiate the experience from budget marketplaces, positioning the brand as a curator of quality.

## Colors

The palette is anchored by a deep, sophisticated **Deep Teal** (#0F4C5C) which serves as the primary brand identifier. This color communicates stability and professional authority. A brighter **Cyan-Teal** (#2EC4B6) is used sparingly for accents and success states, adding a modern tech-forward energy.

**Neutral Scales:**
- **Surface:** #FFFFFF (Pure white for cards and primary containers)
- **Background:** #F8FAFC (Cool-toned off-white to define sections)
- **Text Primary:** #1E293B (Deep charcoal for maximum legibility)
- **Text Secondary:** #64748B (Slate gray for meta-data and labels)

**Functional Colors:**
- **Action/Sale:** #E71D36 (A muted crimson for urgent "Sale" badges or price drops)
- **Trust/Verified:** #2563EB (Classic blue for security badges or verified buyer icons)

## Typography

This design system utilizes a dual-sans-serif approach. **Hanken Grotesk** is used for headlines and product titles, providing a sharp, contemporary look that feels engineered and precise. **Inter** is used for all body copy, technical specifications, and UI labels due to its exceptional legibility and neutral tone.

Hierarchy is established through weight and color rather than excessive size differences. Large display type should be used sparingly for hero banners. For e-commerce listing pages, "Headline-sm" is preferred for product names to ensure multiple items can be seen above the fold.

## Layout & Spacing

The design system employs a **12-column fixed grid** for desktop, centering the content within a 1280px container to ensure readability on wide monitors. On mobile, it transitions to a 2-column or 1-column layout with 16px side margins.

**Spacing Philosophy:**
- Use the **8px base unit** for all spatial relationships.
- **Product Grids:** Use a 24px gutter to provide ample "breathing room" between electronics items.
- **Section Padding:** Use 80px - 120px vertical padding between major homepage sections to reinforce the premium, "uncluttered" feel.

## Elevation & Depth

This design system uses **Tonal Layers** and **Ambient Shadows** to create a sense of organized depth without looking heavy.

- **Level 0 (Flat):** Page background (#F8FAFC).
- **Level 1 (Low):** Product cards and filter sidebars. Use a very soft, diffused shadow: `0 4px 12px rgba(15, 76, 92, 0.05)`.
- **Level 2 (High):** Hover states, dropdown menus, and cart drawers. Use a more pronounced shadow: `0 12px 32px rgba(15, 76, 92, 0.12)`.
- **Outlines:** Use 1px borders in #E2E8F0 for input fields and non-elevated containers to maintain structure in a high-whitespace environment.

## Shapes

The shape language is **Rounded**, reflecting the industrial design of modern consumer electronics. A 0.5rem (8px) radius is the standard for cards and primary buttons. Smaller elements like badges and tags utilize a "Pill" shape to distinguish them from structural UI elements. This roundedness softens the professional teal palette, making the store feel more accessible and user-friendly.

## Components

### Buttons & Call-to-Action
- **Primary CTA:** Solid Primary Teal (#0F4C5C) with white text. 8px corner radius. High-contrast and substantial padding (16px 32px).
- **Secondary CTA:** Outlined Primary Teal with a 1px border. Used for "Add to Cart" in grid views.
- **Ghost CTA:** No border or background, used for "See All" or "Read More" links.

### Product Badges & Tags
- **Status Badges (New, Sale, Limited):** Small pill-shaped containers. "New" in Secondary Cyan, "Sale" in Tertiary Red.
- **Category Tags:** Subtle gray backgrounds (#F1F5F9) with Slate text, used for attributes like "Wireless" or "Fast Charging."

### Price Tags
- **Current Price:** Bold Hanken Grotesk in Primary Teal.
- **Original Price:** Strikethrough in Slate Gray (#64748B), 2px smaller than the current price.
- **Discount Percentage:** Small bold text in Tertiary Red next to the price.

### Cards & Inputs
- **Product Cards:** White background, Level 1 shadow. Image takes up the top 60% of the card area.
- **Input Fields:** 1px border in #CBD5E1. On focus, the border thickens to 2px and changes to Primary Teal with a soft glow.
- **Quantity Selector:** A compact horizontal component with +/- icons and a centered numeral, utilizing a light gray fill to distinguish it from primary actions.