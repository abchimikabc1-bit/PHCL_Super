# PHCL Splash Screen Implementation

## Overview
Created a beautiful splash/intro screen that displays when the app first opens.

## Pages Created

### 1. `/app/splash/page.tsx`
Beautiful splash screen with:
- **Large PHCL Logo** - Purple π (pi) symbol, animated with bounce effect
- **"WELCOME PHCL" Text** - Large heading with gradient (purple to white)
- **Animated Background** - Blurred circles with purple/indigo colors pulsing
- **Bilingual Support** - English and Swahili text
- **Auto-Redirect** - Automatically goes to `/welcome` after 3 seconds
- **Manual Button** - "Enter App" button to skip waiting
- **Loading Animation** - Three pulsing dots during redirect

## Features

### Visual Elements
- Purple gradient background (from-purple-600 to-indigo-800)
- Animated background circles for depth
- Bouncing logo animation
- Staggered text animations (fade in with delay)
- Drop shadows for text readability
- Smooth transitions

### Animations
- Logo bounces slowly (3s cycle)
- Text fades in with staggered timing
- Background circles pulse continuously
- Loading dots animate while redirecting
- All transitions are smooth and professional

### Bilingual
- "WELCOME" or "KARIBU" (Swahili)
- "PHCL" (company name)
- "Crypto Trading Platform" or "Jukwaa la Biashara ya Sarafu"
- "Powered by Pi Network" or "Inayoendarishwa na Pi Network"
- Auto-redirect message or "Kurudi" (returning)

### Flow
1. User opens app → Sees splash screen
2. Logo bounces, text fades in gradually
3. After 3 seconds, "Enter App" button appears
4. Automatically redirects to `/welcome` after 2 more seconds
5. Or user can click button to skip immediately

## Animations Added to globals.css

### New Keyframes
- `bounceSlow` - 3s bounce animation for logo

### New Utility Classes
- `animate-bounce-slow` - Apply 3s bouncing animation

## How to Use

### Visit Splash Screen
```
Navigate to: /splash
```

### Update App Entry Point
To make splash the first page users see, users should navigate to `/splash` first or configure their routing to redirect `/` to `/splash`.

### Customize
- Modify colors in the gradient (currently purple-600 to indigo-800)
- Adjust animation speeds (currently 3s for splash, 2s for redirect)
- Change logo size (currently w-24 h-24 for mobile, w-32 h-32 for desktop)
- Add or remove animations

## Design Details

### Colors Used
- Purple-600: Primary gradient start
- Purple-700: Mid gradient
- Indigo-800: Gradient end
- Purple-500/20: Background circles
- Indigo-500/20: Background circles (delayed)
- White: Text with drop shadow

### Typography
- Main heading: 4xl (sm: 5xl, md: 6xl)
- Subheading: 3xl (sm: 4xl, md: 5xl)
- Subtitle: lg (sm: xl)
- Small text: sm (sm: base)
- All with drop-shadow-lg for readability

### Responsive
- Mobile: Smaller text and logo
- Tablet: Medium text and logo
- Desktop: Large text and logo
- All centered and vertically stacked

## Next Steps
1. Update routing to show splash as entry point
2. Test on different devices (mobile, tablet, desktop)
3. Adjust animation speeds if needed
4. Add to main onboarding flow
