# ArcWorker Protocol: Design System & Brand Context

**Version:** 1.0 (Arc Testnet Era)
**Framework:** Tailwind CSS v4 (Inline Theme)

## 🎨 Color Palette

### Primary (Arc Blue)
Used for primary actions, active states, and brand identity.
- **Brand:** `#2874ca` (Standard Arc Blue)
- **Active/Hover:** `#1d5ca3`
- **Highlight:** `#005ddb` (Vibrant for alerts/money)
- **Subtle:** `bg-blue-50` (Backgrounds for icons/cards)

### Neutrals (Slate)
Used for structure, text, and borders. We avoid pure black/gray.
- **Background (App):** `bg-slate-50` (Light Grayish Blue)
- **Surface (Card):** `bg-white`
- **Text Primary:** `text-slate-900`
- **Text Secondary:** `text-slate-500`
- **Borders:** `border-gray-100` or `border-slate-200`

### Semantic
- **Success (Money/Done):** `text-emerald-500` / `bg-emerald-50`
- **Pending/Warning:** `text-amber-500` / `bg-amber-50`
- **Error/Destructive:** `text-red-500` / `bg-red-50`

### Special Patterns
- **Balance Card Gradient:** `linear-gradient(135deg, #005edc 30%, #00b87b 100%)` (Smoother transition)
- **Sidebar Gradient:** `linear-gradient(160deg, #005edc 0%, #00b87b 100%)` (Vertical Deep Blue to Green)

### Brand Assets
- **Dark Backgrounds:** Use White Logo (`brightness-0 invert`).
- **Light Backgrounds:** Use Standard Blue Logo.

## 🔤 Typography

**Font Family:** `Inter` (Sans-Serif) -> `font-sans`

### Hierarchy
- **Page Title:** `text-3xl font-bold text-slate-900`
- **Section Header:** `text-xl font-bold text-slate-800`
- **Body:** `text-sm text-slate-600`
- **Micro-Copy:** `text-xs font-bold text-slate-400 uppercase tracking-widest`

## 🧩 Component Library

### Buttons
**Primary:**
```tsx
<button className="bg-[#2874ca] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#1d5ca3] transition shadow-lg shadow-blue-100">
  Action
</button>
```

**Secondary/Ghost:**
```tsx
<button className="text-slate-600 font-semibold hover:bg-slate-100 px-6 py-2.5 rounded-xl transition-colors">
  Cancel
</button>
```

**Modal/Primary Actions:**
> [!IMPORTANT]
> All primary actions in Modals (e.g., "Create", "Confirm", "Launch") MUST use the Primary Blue (`bg-[#2874ca]`). Do not use black or other variations.


### Cards
```tsx
<div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
  Content
</div>
```

### Inputs
```tsx
<input className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#2874ca] outline-none transition-all text-sm bg-white" />
```

### Badges
Used for Difficulty Tiers and Status.
- **Easy / Success:** `bg-emerald-50 text-emerald-600 border border-emerald-100`
- **Medium / Pending:** `bg-amber-50 text-amber-600 border border-amber-100`
- **Hard / Error:** `bg-red-50 text-red-600 border border-red-100`
- **Neutral (Tags):** `bg-slate-50 text-slate-500 border border-slate-100`


## 📐 Layout Rules
- **Container:** `max-w-5xl mx-auto` (Standard Dashboard Width)
- **Padding:** `p-8` (Standard Page Padding)
- **Rounded:** `rounded-2xl` or `rounded-3xl` (Soft, modern corners)
