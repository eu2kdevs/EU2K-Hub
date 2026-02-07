# M3 Carousel - React/JavaScript Version

Material Design 3 Carousel component konvertálva Flutter-ből React-be! 😝

## Áttekintés

Ez egy teljes funkcionalitású M3 carousel implementáció, ami támogatja a Material Design 3 specifikáció szerint a következő layout-okat:
- **Hero**: Nagy, kiemelkedő carousel, általában az oldal tetején
- **Contained**: Standard carousel a fő tartalmi területen belül
- **Uncontained**: Edge-to-edge carousel széles elemekkel

## Használat

```jsx
import M3Carousel, { CarouselType, HeroAlignment } from './M3Carousel';

function App() {
  const handleItemClick = (index) => {
    console.log(`Clicked item: ${index}`);
  };

  return (
    <M3Carousel
      type={CarouselType.HERO}
      heroAlignment={HeroAlignment.CENTER}
      height={400}
      onTap={handleItemClick}
    >
      <div>Item 1</div>
      <div>Item 2</div>
      <div>Item 3</div>
    </M3Carousel>
  );
}
```

## Props

### Alapvető Props

| Prop | Típus | Default | Leírás |
|------|-------|---------|--------|
| `width` | `number \| null` | `null` | Carousel szélessége pixelben (null esetén 100%) |
| `height` | `number \| null` | `null` | Carousel magassága pixelben (null esetén 100%) |
| `type` | `CarouselType` | `CarouselType.HERO` | Carousel típusa |
| `children` | `React.Node[]` | `[]` | Carousel elemek |
| `onTap` | `(index: number) => void \| null` | `null` | Kattintás kezelő callback |

### Scrolling Props

| Prop | Típus | Default | Leírás |
|------|-------|---------|--------|
| `freeScroll` | `boolean` | `false` | Szabad scroll engedélyezése (true) vagy automatikus snap (false) |
| `scrollAnimationDuration` | `number` | `500` | Scroll animáció időtartama milliszekundumban |
| `singleSwipeGestureSensitivityRange` | `number` | `300` | Swipe érzékenység (magasabb = kevésbé érzékeny) |

### Hero Type Props

| Prop | Típus | Default | Leírás |
|------|-------|---------|--------|
| `heroAlignment` | `HeroAlignment` | `HeroAlignment.CENTER` | Hero carousel igazítása (LEFT, CENTER, RIGHT) |

### Contained Type Props

| Prop | Típus | Default | Leírás |
|------|-------|---------|--------|
| `isExtended` | `boolean` | `false` | Extended mód (4 látható elem 3 helyett) |

### Uncontained Type Props

| Prop | Típus | Default | Leírás |
|------|-------|---------|--------|
| `uncontainedItemExtent` | `number` | `270.0` | Elemek szélessége pixelben |
| `uncontainedShrinkExtent` | `number` | `150.0` | Minimális elem méret scroll közben |

### Styling Props

| Prop | Típus | Default | Leírás |
|------|-------|---------|--------|
| `childElementBorderRadius` | `number` | `28.0` | Elemek border radius-a pixelben |

## Carousel Típusok

### Hero Carousel
```jsx
<M3Carousel 
  type={CarouselType.HERO}
  heroAlignment={HeroAlignment.CENTER}
  height={400}
>
  {/* 2-3 látható elem egyszerre */}
</M3Carousel>
```

**Alignment opciók:**
- `HeroAlignment.LEFT`: 2 látható elem, balra igazítva
- `HeroAlignment.CENTER`: 3 látható elem, középre igazítva
- `HeroAlignment.RIGHT`: 2 látható elem, jobbra igazítva

### Contained Carousel
```jsx
<M3Carousel 
  type={CarouselType.CONTAINED}
  isExtended={false}
  height={300}
>
  {/* 3-4 látható elem a tartalmi területen belül */}
</M3Carousel>
```

### Uncontained Carousel
```jsx
<M3Carousel 
  type={CarouselType.UNCONTAINED}
  uncontainedItemExtent={270}
  uncontainedShrinkExtent={150}
  height={350}
>
  {/* Edge-to-edge elemek custom mérettel */}
</M3Carousel>
```

## Scroll Módok

### Automatic Snap (default)
```jsx
<M3Carousel freeScroll={false}>
  {/* Swipe-olj/húzd és az elemek automatikusan snapelnek */}
  {/* A swipe sebességét a singleSwipeGestureSensitivityRange szabályozza */}
</M3Carousel>
```

**Működés:**
- **Desktop:** Kattints és húzd → gyors húzás = slide váltás
- **Mobile:** Swipe gesture → sebesség alapú navigáció
- **Sensitivity:** `singleSwipeGestureSensitivityRange` prop (default: 300px/s)
  - Nagyobb érték = kevésbé érzékeny (hosszabb swipe kell)
  - Kisebb érték = érzékenyebb (rövidebb swipe elég)

### Free Scroll
```jsx
<M3Carousel freeScroll={true}>
  {/* Teljes kontroll a scrollozás felett */}
  {/* Nincs automatikus snapping */}
</M3Carousel>
```

## Események

### onTap
A `onTap` callback az elem indexét kapja meg paraméterként:

```jsx
<M3Carousel 
  onTap={(index) => {
    console.log(`Tapped item: ${index}`);
    // További logika...
  }}
>
  {children}
</M3Carousel>
```

## Styling Customization

A komponens CSS-e felülírható a saját stíluslapodban:

```css
.m3-carousel-container {
  /* Container stílusok */
}

.m3-carousel-item {
  /* Elem stílusok */
}

.m3-carousel-item:hover {
  /* Hover effekt customizálás */
}
```

## Flutter-ből való Konverzió Különbségek

### Főbb változások:
1. **State Management**: Flutter `StatefulWidget` → React `useState` hooks
2. **Controller**: Flutter `CarouselController` → React `useRef` + native scroll API
3. **Layout**: Flutter `LayoutBuilder` → React `useEffect` + `ResizeObserver` szimuláció
4. **Gestures**: Flutter `GestureDetector` → React mouse/touch event handlers
5. **Animation**: Flutter `animateTo()` → CSS `scroll-behavior: smooth`

### Mi került el:
- A Flutter specifikus physics modellek (pl. `NeverScrollableScrollPhysics`)
- `InkWell` és `InkSparkle` ripple effektek → CSS pseudo-element alapú ripple szimuláció
- Native platform detection → csak web
- `ClipRRect` → CSS `border-radius` + `overflow: hidden`

### Mi lett JAVÍTVA a JS verzióban:
- ✅ **Velocity-based swipe detection** - sebesség alapú gesture felismerés
- ✅ **Drag prevention** - text selection és image dragging letiltva
- ✅ **Mouse + Touch support** - desktop és mobil egyaránt működik
- ✅ **Grabbing cursor feedback** - vizuális visszajelzés húzás közben

## Drag & Swipe Működés

A komponens pontosan szimulálja a Flutter `onHorizontalDragEnd` viselkedését:

```javascript
// Sebesség számítás (mint a Dart primaryVelocity)
const velocity = (deltaX / deltaTime) * 1000; // px/s

// Küszöbérték ellenőrzés
if (velocity > singleSwipeGestureSensitivityRange) {
  scrollFrame(0); // Jobbra swipe = előző elem
} else if (velocity < -singleSwipeGestureSensitivityRange) {
  scrollFrame(1); // Balra swipe = következő elem
}
```

**Fontos különbség a sima scroll-tól:**
- Nem a **távolság** számít, hanem a **sebesség**! 😝
- Gyors, rövid swipe → slide váltás ✅
- Lassú, hosszú drag → nem vált ❌

## Teljesítmény Optimalizálás

A komponens a következő optimalizálásokat tartalmazza:
- `will-change: transform` a smooth animációkhoz
- Lazy loading támogatás (egyszerűen add hozzá a children-hez)
- Debounced resize handling
- CSS transitions hardware accelerációval

## Browser Kompatibilitás

- Chrome/Edge: ✅ Teljes támogatás
- Firefox: ✅ Teljes támogatás
- Safari: ✅ Teljes támogatás
- IE11: ❌ Nem támogatott (modern hooks + CSS features)

## Példa Projektek

Nézd meg az `ExampleCarousel.jsx` fájlt komplett példákért! 🫩

## Licenc

Konvertálva a `m3_carousel` Flutter package-ből.
Original package: https://pub.dev/packages/m3_carousel

---

Készítette: EU2K Hub projekt részeként 😭
Svédország, Stockholm, Södermalm waiting for me at 18-19! 🇸🇪
