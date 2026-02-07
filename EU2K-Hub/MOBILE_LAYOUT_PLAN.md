# Mobil Layout Terv - YouHub

## Fontos megkötések
- **A `.main-scroll-area` osztályt NEM módosítjuk!** Ez a kritikus követelmény.
- Csak a `.main-scroll-area` **BELÜLI** komponenseket optimalizáljuk mobilra.

## Jelenlegi állapot
- Sidebar már el van rejtve 700px alatt
- Van néhány media query (700px, 900px, 1200px)
- A main-scroll-area padding: 22px (nem módosítjuk)

## Optimalizálandó területek

### 1. App-bg padding (mobilra csökkentés)
- Jelenleg: `padding: 32px 32px 32px 12px`
- Mobilra: `padding: 8px` vagy `padding: 16px`

### 2. Header optimalizálás
- **Header-content**: Jelenleg `flex-direction: row`, mobilra `column`
- **Welcome-container**: Mobilra kisebb margók
- **Header-icon-container**: Mobilra teljes szélesség, gombok újrarendezése
- **Header-icon-gradient**: Mobilra kisebb padding, gombok kisebb méretben

### 3. Banner komponensek (info-banner, warning-banner)
- **Flex irány**: `row` → `column` mobilra
- **Banner-actions**: Mobilra teljes szélességű gombok
- **Banner-texts**: Mobilra kisebb padding
- **Ikonok**: Mobilra kisebb méret

### 4. Main-content
- Jelenleg már van media query 900px-re: `padding: 0 8px 32px 32px`
- Mobilra további optimalizálás: `padding: 0 8px 16px 8px`

### 5. Kártyák és grid-ek
- Top-cards-row: Mobilra vertical stack
- Red-card: Mobilra teljes szélesség
- Egyéb kártyák: Mobilra optimalizált méretek

### 6. Footer
- Mobilra column layout
- Kisebb padding és gap

## Breakpoint stratégia
- **Desktop**: > 900px (jelenlegi)
- **Tablet**: 700px - 900px
- **Mobil**: < 700px (fő optimalizálás)

## Implementációs sorrend
1. ✅ App-bg padding optimalizálás
2. ✅ Header responsive design
3. ✅ Banner komponensek mobilra
4. ✅ Main-content padding finomítás
5. ✅ Kártyák és grid-ek optimalizálása
6. ✅ Footer mobil layout
7. ✅ Notifications column optimalizálás
8. ✅ Event frame és kártyák optimalizálás

## Implementált változtatások

### App-bg
- Padding: `32px 32px 32px 12px` → `8px` mobilra

### Header
- Header-content: `flex-direction: column` mobilra
- Welcome-container: kisebb ikonok (40px), row layout
- Header-icon-gradient: teljes szélesség, kisebb padding
- Gombok: kisebb méretek, flex layout

### Banner komponensek
- Info-banner és warning-banner: `flex-direction: column` mobilra
- Banner-actions: teljes szélességű, column layout
- Banner gombok: teljes szélesség, 44px magasság
- Ikonok: 28px mobilra

### Main-content
- Padding: `0 8px 16px 8px` mobilra

### Kártyák
- Red-card.large: 280px szélesség, 180px magasság mobilra
- Red-card.medium: 100px szélesség mobilra
- Red-card.small: 48px szélesség mobilra

### Footer
- Flex-direction: column mobilra
- Footer-left és footer-right: 100% szélesség

### Egyéb
- Permission popup: kisebb padding és margin mobilra
- Notifications column: teljes szélesség mobilra
- Section title: 18px font-size mobilra
- Event frame: kisebb padding mobilra

## Technikai megjegyzések
- Használjuk a meglévő media query struktúrát
- Ne módosítsuk a `.main-scroll-area` osztályt
- Használjunk `max-width` media query-ket
- Fontos: a scroll működés ne változzon meg

