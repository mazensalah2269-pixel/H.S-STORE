import { Product } from './types';

// Helper to generate elegant vector SVGs of handmade items for the initial store state
export function generateHandmadeSVG(
  category: 'shawl' | 'set' | 'gift',
  baseColor: string,
  accentColor: string,
  view: 'full' | 'texture' | 'detail'
): string {
  const width = 600;
  const height = 500;

  let content = '';

  // Texture-specific drawings
  if (view === 'texture') {
    // Zoomed knit pattern
    content = `
      <defs>
        <pattern id="knit-zoom" width="40" height="40" patternUnits="userSpaceOnUse">
          <!-- Handcrafted knit loop paths -->
          <path d="M 10,0 C 15,10 15,20 10,30 C 5,20 5,10 10,0 Z M 30,0 C 35,10 35,20 30,30 C 25,20 25,10 30,0 Z" fill="none" stroke="${accentColor}" stroke-width="2.5" opacity="0.65" />
          <path d="M 20,10 C 25,20 25,30 20,40 C 15,30 15,20 20,10 Z M 0,10 C 5,20 5,30 0,40 C -5,30 -5,20 0,10 Z" fill="none" stroke="${baseColor}" stroke-width="2" opacity="0.5" />
          <path d="M 10,15 L 30,15" stroke="${accentColor}" stroke-width="1" stroke-dasharray="2 2" opacity="0.3" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="${baseColor}" />
      <rect width="100%" height="100%" fill="url(#knit-zoom)" />
      
      <!-- Premium Overlay card / Badge -->
      <rect x="50" y="50" width="500" height="400" rx="20" fill="none" stroke="white" stroke-width="1.5" opacity="0.15" />
      <g transform="translate(300, 250)" text-anchor="middle">
        <circle r="45" fill="black" opacity="0.25" />
        <circle r="40" fill="none" stroke="white" stroke-width="1" stroke-dasharray="4 4" opacity="0.7" />
        <text y="6" font-family="'Playfair Display', serif" font-size="14" font-style="italic" fill="white" letter-spacing="2">100% ORGANIC</text>
      </g>
    `;
  } else if (view === 'detail') {
    // Showcase stitching detail, label tag and elegant macro closeup
    content = `
      <defs>
        <linearGradient id="tagGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#EADDC9" />
          <stop offset="100%" stop-color="#C2B29F" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="${baseColor}dd" />
      
      <!-- Knitted lines background -->
      <path d="M 0,100 Q 150,150 300,100 T 600,100 M 0,150 Q 150,200 300,150 T 600,150 M 0,200 Q 150,250 300,200 T 600,200" fill="none" stroke="${accentColor}" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.4" />
      
      <!-- Wooden tag / Label indicating authentic craft -->
      <g transform="translate(180, 150) rotate(-12)">
        <rect width="240" height="140" rx="8" fill="url(#tagGrad)" filter="drop-shadow(0 10px 15px rgba(0,0,0,0.15))" />
        <!-- Tag border -->
        <rect x="10" y="10" width="220" height="120" rx="4" fill="none" stroke="#7A6855" stroke-width="1" opacity="0.4" />
        <!-- String hole -->
        <circle cx="25" cy="70" r="8" fill="#5c4d3c" />
        <!-- Text -->
        <text x="125" y="65" font-family="'Playfair Display', serif" font-size="18" fill="#423525" font-weight="bold" text-anchor="middle" letter-spacing="1">H.S HandMade</text>
        <text x="125" y="90" font-family="'Inter', sans-serif" font-size="10" fill="#6E5E4E" text-anchor="middle" letter-spacing="3">AUTHENTIC SEWING</text>
        <line x1="50" y1="105" x2="200" y2="105" stroke="#7A6855" stroke-width="1" opacity="0.3" />
        
        <!-- Hanging string -->
        <path d="M 17,-100 Q -10,-20 17,70" fill="none" stroke="#8c7a65" stroke-width="3" />
      </g>
      
      <!-- Beautiful measuring tape and crochet hook -->
      <g transform="translate(420, 320) rotate(15)">
        <line x1="-150" y1="0" x2="150" y2="0" stroke="#f5d061" stroke-width="12" stroke-linecap="round" />
        <!-- Tape ticks -->
        <path d="M -130,-4 L -130,4 M -110,-4 L -110,4 M -90,-4 L -90,4 M -70,-4 L -70,4 M -50,-4 L -50,4 M -30,-4 L -30,4 M -10,-4 L -10,4 M 10,-4 L 10,4 M 30,-4 L 30,4 M 50,-4 L 50,4 M 70,-4 L 70,4 M 90,-4 L 90,4 M 110,-4 L 110,4 M 130,-4 L 130,4" stroke="#5a4710" stroke-width="1.5" />
      </g>
    `;
  } else {
    // Main View of the item
    if (category === 'shawl') {
      content = `
        <rect width="100%" height="100%" fill="#FAF6F0" />
        <!-- Soft gradient shadow -->
        <ellipse cx="300" cy="420" rx="180" ry="35" fill="black" opacity="0.06" filter="blur(8px)" />
        
        <!-- Fringes and tassels -->
        <g stroke="${accentColor}" stroke-width="2.5" opacity="0.8">
          ${Array.from({ length: 25 })
            .map((_, i) => {
              const x = 180 + i * 10;
              return `<path d="M ${x},320 L ${x + 5},370 C ${x + 2},380 ${x + 8},390 ${x + 5},400" />`;
            })
            .join('')}
        </g>

        <!-- Main folded shawl draping -->
        <path d="M 160,200 C 160,180 200,140 300,140 C 400,140 440,180 440,200 C 440,260 410,320 300,320 C 190,320 160,260 160,200 Z" fill="${baseColor}" filter="drop-shadow(0 15px 25px rgba(0,0,0,0.12))" />
        
        <!-- Elegant folds & highlights -->
        <path d="M 180,210 Q 300,280 420,210" fill="none" stroke="white" stroke-width="2" opacity="0.15" />
        <path d="M 210,240 Q 300,310 390,240" fill="none" stroke="white" stroke-width="2" opacity="0.12" />
        <path d="M 162,200 Q 300,170 438,200" fill="none" stroke="${accentColor}" stroke-width="3" opacity="0.3" />
        
        <!-- Intricate floral embroidery pattern or organic stitch details on the borders -->
        <g fill="none" stroke="${accentColor}" stroke-width="1.5" opacity="0.8">
          <path d="M 220,300 C 240,290 260,310 280,300 C 300,290 320,310 340,300" />
          <circle cx="230" cy="300" r="3" fill="${accentColor}" />
          <circle cx="250" cy="295" r="3" fill="${accentColor}" />
          <circle cx="270" cy="305" r="3" fill="${accentColor}" />
          <circle cx="290" cy="295" r="3" fill="${accentColor}" />
          <circle cx="310" cy="305" r="3" fill="${accentColor}" />
          <circle cx="330" cy="295" r="3" fill="${accentColor}" />
        </g>

        <!-- Elegant knitting pins overlay -->
        <g transform="translate(140, 100) rotate(-45)">
          <line x1="0" y1="0" x2="160" y2="0" stroke="#DFD5C6" stroke-width="4" stroke-linecap="round" />
          <circle cx="160" cy="0" r="8" fill="#8E7D67" />
        </g>
      `;
    } else if (category === 'set') {
      content = `
        <rect width="100%" height="100%" fill="#F8F5F0" />
        <!-- Shadows -->
        <ellipse cx="220" cy="410" rx="90" ry="20" fill="black" opacity="0.05" filter="blur(6px)" />
        <ellipse cx="380" cy="410" rx="90" ry="20" fill="black" opacity="0.05" filter="blur(6px)" />

        <!-- Knitted Beanie/Hat -->
        <g transform="translate(140, 150)">
          <!-- Main beanie shape -->
          <path d="M 10,120 C 10,40 50,10 110,10 C 170,10 210,40 210,120 Z" fill="${baseColor}" filter="drop-shadow(0 10px 15px rgba(0,0,0,0.1))" />
          <!-- Rolled cuff -->
          <rect x="0" y="110" width="220" height="35" rx="8" fill="${accentColor}" />
          <!-- Pom-pom -->
          <circle cx="110" cy="5" r="28" fill="${accentColor}" opacity="0.95" />
          <circle cx="110" cy="5" r="24" fill="none" stroke="white" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.4" />
          
          <!-- Knit texture lines on hat -->
          <path d="M 60,35 Q 90,80 60,110 M 110,15 L 110,110 M 160,35 Q 130,80 160,110" fill="none" stroke="white" stroke-width="2" opacity="0.15" />
        </g>

        <!-- Coordinated Knit Scarf / Neckwarmer folded -->
        <g transform="translate(260, 240)">
          <path d="M 20,40 C 20,40 40,20 110,20 C 180,20 200,40 200,40 C 200,40 210,110 110,110 C 10,110 20,40 20,40 Z" fill="${baseColor}" filter="drop-shadow(0 12px 20px rgba(0,0,0,0.1))" />
          <path d="M 20,40 C 40,80 180,80 200,40" fill="none" stroke="${accentColor}" stroke-width="5" opacity="0.25" />
          
          <!-- Cozy knit ribs -->
          <path d="M 60,25 L 60,105 M 90,22 L 90,108 M 120,22 L 120,108 M 150,25 L 150,105" fill="none" stroke="white" stroke-width="2" opacity="0.2" />
        </g>
      `;
    } else {
      // Gift category (beautifully wrapped box with craft ribbons and tags)
      content = `
        <rect width="100%" height="100%" fill="#FAF7F2" />
        <!-- Gift box shadow -->
        <rect x="180" y="210" width="240" height="190" rx="6" fill="black" opacity="0.05" filter="blur(10px)" />
        
        <!-- Box Base (Kraft paper texture / brown/beige tone) -->
        <rect x="190" y="200" width="220" height="180" rx="4" fill="#D7C4AE" stroke="#BCA389" stroke-width="1.5" />
        
        <!-- Premium Ribbon wrapped around box -->
        <!-- Vertical ribbon -->
        <rect x="290" y="200" width="20" height="180" fill="${baseColor}" />
        <!-- Horizontal ribbon -->
        <rect x="190" y="280" width="220" height="20" fill="${baseColor}" />
        
        <!-- Ribbon Highlights -->
        <rect x="298" y="200" width="4" height="180" fill="white" opacity="0.2" />
        <rect x="190" y="288" width="220" height="4" fill="white" opacity="0.2" />

        <!-- Elegant Ribbon Bow on Top -->
        <g transform="translate(300, 200)">
          <path d="M -5,-5 C -40,-35 -45,10 -5,-5 Z" fill="${baseColor}" stroke="${accentColor}" stroke-width="1" />
          <path d="M 5,-5 C 40,-35 45,10 5,-5 Z" fill="${baseColor}" stroke="${accentColor}" stroke-width="1" />
          <!-- Bow center knot -->
          <rect x="-8" y="-12" width="16" height="14" rx="3" fill="${accentColor}" />
          <!-- Curled ribbons hanging -->
          <path d="M -5,0 C -20,20 -15,40 -25,60" fill="none" stroke="${baseColor}" stroke-width="3" stroke-linecap="round" />
          <path d="M 5,0 C 20,20 15,40 25,60" fill="none" stroke="${baseColor}" stroke-width="3" stroke-linecap="round" />
        </g>

        <!-- Gift card label -->
        <g transform="translate(215, 230) rotate(-15)">
          <rect width="60" height="35" rx="3" fill="#FFFBF0" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))" />
          <line x1="8" y1="12" x2="52" y2="12" stroke="${baseColor}" stroke-width="1" opacity="0.3" />
          <line x1="8" y1="18" x2="45" y2="18" stroke="${baseColor}" stroke-width="1" opacity="0.3" />
          <!-- Tiny red heart symbol -->
          <path d="M 45,26 C 42,23 45,21 47,23 C 49,21 52,23 49,26 L 47,28 Z" fill="#E53E3E" />
          <circle cx="6" cy="18" r="1.5" fill="#C5A880" />
        </g>
      `;
    }
  }

  // Create unified responsive SVG
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="display:block; border-radius:12px; background-color:#FAF8F5;">
    ${content}
  </svg>`;

  // Convert to clean Data URL
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// Generate premium mock initial products
export const getInitialProducts = (): Product[] => {
  return [
    {
      id: 'prod-1',
      title: 'Luxury Embroidered Kashmiri Shawl',
      category: 'Shawls & Scarves',
      price: 120,
      description: 'An exquisitely soft wool shawl hand-embroidered with traditional floral motifs. Designed in an oversized profile for cozy comfort and dramatic drape.',
      images: [
        '/images/shawl_crimson_full.jpg',
        '/images/shawl_crimson_texture.jpg',
        '/images/shawl_crimson_detail.jpg',
      ],
      createdAt: new Date('2026-01-10').toISOString(),
    },
    {
      id: 'prod-2',
      title: 'Hand-Knit Cozy Merino Infinity Scarf',
      category: 'Shawls & Scarves',
      price: 45,
      description: 'Beautifully textured loop scarf knit from 100% organic extra-fine merino wool. Extremely warm, chunky, and skin-friendly in winter weather.',
      images: [
        '/images/scarf_teal_full.jpg',
        '/images/scarf_teal_texture.jpg',
        '/images/scarf_teal_detail.jpg',
      ],
      createdAt: new Date('2026-02-15').toISOString(),
    },
    {
      id: 'prod-3',
      title: 'Royal Merino Beanie & Cozy Scarf Set',
      category: 'Full Sets',
      price: 160,
      description: 'A complete luxury winter ensemble featuring matching ribbed merino beanie, folded long scarf, and wool mittens, coordinated in rich forest tones.',
      images: [
        '/images/set_forest_full.jpg',
        '/images/set_forest_texture.jpg',
        '/images/set_forest_detail.jpg',
      ],
      createdAt: new Date('2026-03-01').toISOString(),
    },
    {
      id: 'prod-4',
      title: 'Pastel Dream Woolen Winter Set',
      category: 'Full Sets',
      price: 140,
      description: 'Beautifully soft pastel colored headbands, matching scarf, and cozy hand-warmers crocheted carefully with premium cotton-wool blend thread.',
      images: [
        '/images/set_pastel_full.jpg',
        '/images/set_pastel_texture.jpg',
        '/images/set_pastel_detail.jpg',
      ],
      createdAt: new Date('2026-03-20').toISOString(),
    },
    {
      id: 'prod-5',
      title: 'Intricate Macrame Handwoven Tapestry',
      category: 'Gifts',
      price: 75,
      description: 'Made with fine 100% cotton cords hung on a natural driftwood branch. This modern chic wall tapestry adds a warm artisanal energy to any room.',
      images: [
        '/images/gift_tapestry_full.jpg',
        '/images/gift_tapestry_texture.jpg',
        '/images/gift_tapestry_detail.jpg',
      ],
      createdAt: new Date('2026-04-05').toISOString(),
    },
    {
      id: 'prod-6',
      title: 'Luxury Scented Lavender Gift Hamper',
      category: 'Gifts',
      price: 95,
      description: 'A beautiful woven gift tray carrying hand-poured soy candles, lavender organic bundle, a custom knit sachet, and a handwritten personalized greeting card.',
      images: [
        '/images/gift_hamper_full.jpg',
        '/images/gift_hamper_texture.jpg',
        '/images/gift_hamper_detail.jpg',
      ],
      createdAt: new Date('2026-05-12').toISOString(),
    }
  ];
};
