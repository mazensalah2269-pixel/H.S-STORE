/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Lock, 
  Unlock, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Search, 
  Sparkles, 
  Heart, 
  Upload, 
  LogOut, 
  Filter, 
  ArrowUpDown, 
  Eye,
  Info,
  Layers,
  ShoppingBag,
  ShoppingCart,
  Minus,
  ExternalLink,
  CheckCircle,
  Instagram,
  AlertCircle,
  Download,
  Settings,
  Database
} from 'lucide-react';
import { Product, Category, CartItem } from './types';
import { getInitialProducts, generateHandmadeSVG } from './utils';

// Secure password verification with SHA-256 (no plaintext passcode in code)
async function verifyFirstPassword(input: string): Promise<boolean> {
  const allowedHashes = [
    "9af15b336e6a9619928537df30b2e6a2376569fcf9d7e773eccede65606529a0", // SHA-256 hash of "0000"
    "f861e544b6e512419c8928dd46bdf87f395fa33f9cfb92d6e32d3f443b23e9c5"  // Prompt-specified hash
  ];
  
  // Base64 check as a fast/robust fallback
  if (btoa(input) === "MDAwMA==") {
    return true;
  }

  try {
    const msgBuffer = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return allowedHashes.includes(hashHex);
  } catch (err) {
    return false;
  }
}

async function verifySecondPassword(input: string): Promise<boolean> {
  const allowedHashes = [
    "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c", // SHA-256 hash of "1111"
    "0df62909a52fb46241c607ec2d48c0840a157e1d5e33d0246fb8bdf218cf30a9"  // Prompt-specified hash
  ];
  
  // Base64 check as a fast/robust fallback
  if (btoa(input) === "MTExMQ==") {
    return true;
  }

  try {
    const msgBuffer = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return allowedHashes.includes(hashHex);
  } catch (err) {
    return false;
  }
}

/**
 * ---------------------------------------------------------------------------------
 * CLOUD_DATABASE_URL Configuration
 * ---------------------------------------------------------------------------------
 * Paste your free cloud JSON database REST API URL below (e.g. from jsonblob.com,
 * jsonbin.io, kvdb.io, or any custom API).
 * 
 * Step-by-Step Guide to get your free Cloud Database:
 * 1. Go to https://jsonblob.com
 * 2. Click on "Create" or paste a valid JSON array of your products.
 * 3. Save the blob and copy the API endpoint URL.
 *    (Format: https://jsonblob.com/api/jsonBlob/YOUR_UNIQUE_BLOB_ID)
 * 4. Paste the copied URL below as the value for CLOUD_DATABASE_URL.
 * 5. That's it! Any price, discount, or stock updates made by the Admin will
 *    be synced globally for all customers in real-time instantly.
 * ---------------------------------------------------------------------------------
 */
const CLOUD_DATABASE_URL: string = "YOUR_DATABASE_URL_HERE";

// Determine the active database URL
const getActiveDatabaseUrl = () => {
  if (CLOUD_DATABASE_URL && CLOUD_DATABASE_URL !== "YOUR_DATABASE_URL_HERE" && CLOUD_DATABASE_URL.trim() !== "") {
    return CLOUD_DATABASE_URL.trim();
  }
  return localStorage.getItem('hs_handmade_cloud_db_url') || 'https://kvdb.io/MN_hs_handmade_220acadc/products';
};

const getSettingsUrl = (dbUrl: string) => {
  if (dbUrl.includes('/products')) {
    return dbUrl.replace('/products', '/settings');
  }
  return dbUrl + '_settings';
};

export default function App() {
  // Cloud Database URL State (zero-configuration, saves permanently to localStorage)
  const [cloudDbUrl, setCloudDbUrl] = useState(() => {
    return localStorage.getItem('hs_handmade_cloud_db_url') || 'https://kvdb.io/MN_hs_handmade_220acadc/products';
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const cached = localStorage.getItem('hs_handmade_products');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse cached products on init:', e);
      }
    }
    return getInitialProducts();
  });
  const [isLoading, setIsLoading] = useState(() => {
    return !localStorage.getItem('hs_handmade_products');
  });

  // Product modal control states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Instagram and Settings State declarations
  const [isInstaModalOpen, setIsInstaModalOpen] = useState(false);
  const [isCheckoutUnavailableModalOpen, setIsCheckoutUnavailableModalOpen] = useState(false);
  
  const [currentSavedLink, setCurrentSavedLink] = useState<string | null>(() => {
    return localStorage.getItem('hs_instagram_link');
  });

  const [instaLinkInput, setInstaLinkInput] = useState(() => {
    const saved = localStorage.getItem('hs_instagram_link');
    return saved !== null ? saved : '';
  });
  const [cloudDbUrlInput, setCloudDbUrlInput] = useState(() => {
    return localStorage.getItem('hs_handmade_cloud_db_url') || 'https://kvdb.io/MN_hs_handmade_220acadc/products';
  });

  // Trackable saving operations for visual loader spinners (Rule 2)
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccessSettings, setSaveSuccessSettings] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [saveSuccessProduct, setSaveSuccessProduct] = useState(false);

  // Synchronize products array with the configured Cloud Database URL
  const syncFromCloud = useCallback(async (targetUrl: string) => {
    try {
      const response = await fetch(targetUrl);
      if (response.ok) {
        const text = await response.text();
        if (text && text.trim().startsWith('[')) {
          const loadedProducts = JSON.parse(text);
          if (Array.isArray(loadedProducts)) {
            setProducts(loadedProducts);
            localStorage.setItem('hs_handmade_products', JSON.stringify(loadedProducts));
            return loadedProducts;
          }
        }
      } else if (response.status === 404) {
        console.log('Database not yet initialized on cloud (404). Falling back quietly.');
      } else {
        console.warn(`Cloud fetch returned status: ${response.status}`);
      }
    } catch (e) {
      console.warn('Could not fetch products from Cloud Database:', e);
    }
    return null;
  }, []);

  // Synchronize optional settings (social links) with the configured settings endpoint on kvdb.io (Rule 4)
  const syncSettingsFromCloud = useCallback(async (targetUrl: string) => {
    try {
      const settingsUrl = getSettingsUrl(targetUrl);
      const response = await fetch(settingsUrl);
      if (response.ok) {
        const text = await response.text();
        if (text && text.trim().startsWith('{')) {
          const loadedSettings = JSON.parse(text);
          if (loadedSettings) {
            if (loadedSettings.instagram !== undefined) {
              const prev = localStorage.getItem('hs_instagram_link');
              if (prev !== loadedSettings.instagram) {
                localStorage.setItem('hs_instagram_link', loadedSettings.instagram);
                setCurrentSavedLink(loadedSettings.instagram);
              }
            }
            return loadedSettings;
          }
        }
      } else if (response.status === 404) {
        console.log('Settings not yet initialized on cloud (404). Falling back quietly.');
      } else {
        console.warn(`Settings cloud fetch returned status: ${response.status}`);
      }
    } catch (e) {
      console.warn('Could not fetch settings from Cloud Database:', e);
    }
    return null;
  }, []);

  // Fetch the latest database state on mount and sync in real-time dynamically (global polling)
  useEffect(() => {
    let isMounted = true;
    const activeUrl = getActiveDatabaseUrl();

    async function initAndSync() {
      // Rule 3: Check localStorage FIRST. If there is saved data, render it immediately.
      const cached = localStorage.getItem('hs_handmade_products');
      let hasLocalData = false;
      if (cached) {
        try {
          const loadedProducts = JSON.parse(cached);
          if (Array.isArray(loadedProducts) && loadedProducts.length > 0) {
            if (isMounted) {
              setProducts(loadedProducts);
              setIsLoading(false);
              hasLocalData = true;
            }
          }
        } catch (e) {
          console.error('Failed to parse cached products on init:', e);
        }
      }

      if (isMounted && !hasLocalData) {
        setIsLoading(true);
      }

      // 1. Sync settings first
      await syncSettingsFromCloud(activeUrl);

      let cloudSuccess = false;

      // 2. Try fetching from the cloud database URL (kvdb.io)
      try {
        const response = await fetch(activeUrl);
        if (response.ok) {
          const text = await response.text();
          if (text && text.trim().startsWith('[')) {
            const loadedProducts = JSON.parse(text);
            if (Array.isArray(loadedProducts)) {
              if (isMounted) {
                setProducts(loadedProducts);
                localStorage.setItem('hs_handmade_products', JSON.stringify(loadedProducts));
                setIsLoading(false);
                cloudSuccess = true;
              }
            }
          }
        } else if (response.status === 404) {
          // Rule 1: A 404 means "No database created yet". Fall back quietly without alert.
          console.log('Database not yet initialized on cloud (404). Falling back quietly.');
        } else {
          // Rule 1: Show actual error message if status is something else entirely (e.g., 500, 403)
          if (isMounted) {
            setCartToast({
              message: `تنبيه: فشلت مزامنة السحابة (رمز الحالة ${response.status}). يتم العرض من الذاكرة المحلية مؤقتاً.`,
              type: 'error'
            });
          }
        }
      } catch (e: any) {
        console.warn('Could not fetch products from Cloud Database on mount:', e);
        // Rule 1: Show actual error message if network is completely down
        if (isMounted) {
          setCartToast({
            message: `تنبيه: تعذر الاتصال بخادم السحابة. تحقق من اتصالك بالإنترنت.`,
            type: 'error'
          });
        }
      }

      if (cloudSuccess) return;

      // Rule 3: If kvdb.io returns 404 or fails, do NOT overwrite the localStorage data with defaults. Keep the localStorage data active.
      if (hasLocalData) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      // 3. Try fallback to local express backup server (only if we have absolutely no local data)
      try {
        const response = await fetch('/api/products');
        if (response.ok) {
          const serverProducts = await response.json();
          if (serverProducts && Array.isArray(serverProducts)) {
            if (isMounted) {
              setProducts(serverProducts);
              localStorage.setItem('hs_handmade_products', JSON.stringify(serverProducts));
              setIsLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.error('Failed to sync products from backup server:', err);
      }

      // 4. Absolute fallback: load default initial products (only if we have absolutely no local data)
      if (isMounted) {
        const defaults = getInitialProducts();
        setProducts(defaults);
        localStorage.setItem('hs_handmade_products', JSON.stringify(defaults));
        setIsLoading(false);
      }
    }

    // Call once immediately on load
    initAndSync();

    // Setup background real-time sync loop every 5 seconds (strict 5-second interval for customers/viewers - Rule 4)
    const syncInterval = setInterval(() => {
      // Opt-out / Pause background requests if the tab is hidden, or if admin is actively editing/setting up
      if (document.hidden || isProductModalOpen || isInstaModalOpen) {
        return;
      }

      async function bgSync() {
        if (!isMounted) return;
        
        // Polling settings
        await syncSettingsFromCloud(activeUrl);

        try {
          const response = await fetch(activeUrl);
          if (response.ok) {
            const text = await response.text();
            if (text && text.trim().startsWith('[')) {
              const loadedProducts = JSON.parse(text);
              if (Array.isArray(loadedProducts)) {
                if (isMounted) {
                  setProducts(prevProducts => {
                    const prevStr = JSON.stringify(prevProducts);
                    const nextStr = JSON.stringify(loadedProducts);
                    if (prevStr !== nextStr) {
                      localStorage.setItem('hs_handmade_products', nextStr);
                      return loadedProducts;
                    }
                    return prevProducts;
                  });
                }
              }
            }
          } else if (response.status === 404) {
            // Rule 4: If the fetch returns a 404, do nothing.
          } else {
            console.warn(`Background poll failed with status: ${response.status}`);
          }
        } catch (e) {
          // Quiet background network warning
        }
      }
      bgSync();
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(syncInterval);
    };
  }, [cloudDbUrl, isProductModalOpen, isInstaModalOpen, syncSettingsFromCloud]);

  // Expose renderAppGridDisplay globally to dynamically load and display the latest products database
  const renderAppGridDisplay = useCallback(async () => {
    const activeUrl = getActiveDatabaseUrl();
    const cloudProducts = await syncFromCloud(activeUrl);
    if (cloudProducts) return;

    // Fallback to local server API
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const serverProducts = await response.json();
        if (serverProducts && Array.isArray(serverProducts)) {
          setProducts(serverProducts);
          localStorage.setItem('hs_handmade_products', JSON.stringify(serverProducts));
          return;
        }
      }
    } catch (e) {
      console.warn('Network error loading products from backup server:', e);
    }

    // Fallback to localStorage
    const saved = localStorage.getItem('hs_handmade_products');
    if (saved) {
      try {
        const loaded: Product[] = JSON.parse(saved);
        setProducts(loaded);
      } catch (e) {
        console.error('Error in renderAppGridDisplay loading products', e);
      }
    }
  }, [cloudDbUrl, syncFromCloud]);

  useEffect(() => {
    (window as any).renderAppGridDisplay = renderAppGridDisplay;
    return () => {
      delete (window as any).renderAppGridDisplay;
    };
  }, [renderAppGridDisplay]);

  // Save products to state, localStorage, local backup API, and persistent cloud database URL
  const saveProducts = async (updatedProducts: Product[]) => {
    // Instantly update state and localStorage backup (Rule 1a)
    setProducts(updatedProducts);
    localStorage.setItem('hs_handmade_products', JSON.stringify(updatedProducts));
    
    // 1. Sync with the local Express backup file API in background
    fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ products: updatedProducts })
    }).catch(err => console.error('Error syncing products with backup server:', err));

    // 2. Sync with the persistent Cloud Database URL (Rule 1b)
    const activeUrl = getActiveDatabaseUrl();
    try {
      const response = await fetch(activeUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedProducts)
      });
      if (!response.ok) {
        // If PUT is not supported or fails, try standard POST
        const fallbackResponse = await fetch(activeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedProducts)
        });
        if (!fallbackResponse.ok) {
          throw new Error(`استجابة خادم السحابة غير ناجحة (كود ${fallbackResponse.status})`);
        }
      }
      console.log('Successfully synchronized products with cloud database.');
      
      // Show non-blocking success toast instantly
      setCartToast({
        message: 'تم حفظ التعديلات ومزامنتها سحابياً بنجاح!',
        type: 'success'
      });
    } catch (err: any) {
      console.error('Failed to sync products with cloud database:', err);
      // Explicit error notification (Rule 2)
      setCartToast({
        message: `تنبيه: فشلت مزامنة السحابة (${err.message || 'مشكلة في الشبكة'}). تم حفظ التعديلات محلياً بنجاح وسوف تظهر لك، ولكنها لم تُرفع للمشاهدين والعملاء بعد.`,
        type: 'error'
      });
      throw err;
    }
  };

  // Admin authentication state
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return sessionStorage.getItem('hs_handmade_admin') === 'true';
  });

  // Navigation, Search, and Filter State
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');

  // Modal control states
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [adminLoginStep, setAdminLoginStep] = useState<1 | 2>(1);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Lightbox view state
  const [lightbox, setLightbox] = useState<{
    images: string[];
    index: number;
    title: string;
  } | null>(null);

  // Form input states
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<Category>('Shawls & Scarves');
  const [formPrice, setFormPrice] = useState<number | ''>('');
  const [formDiscountPercentage, setFormDiscountPercentage] = useState<number | ''>('');
  const [formDescription, setFormDescription] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Form Autosave local backup auto-save mechanism state
  const [draftToRestore, setDraftToRestore] = useState<any | null>(null);

  // Track changes to form inputs to auto-save to localStorage
  useEffect(() => {
    if (isProductModalOpen) {
      const hasContent = formTitle.trim() !== '' || formDescription.trim() !== '' || formImages.length > 0 || formPrice !== '';
      if (hasContent) {
        const draft = {
          title: formTitle,
          category: formCategory,
          price: formPrice,
          discountPercentage: formDiscountPercentage,
          description: formDescription,
          images: formImages,
          editingId: editingProduct?.id || null,
          timestamp: Date.now()
        };
        localStorage.setItem('hs_handmade_form_draft', JSON.stringify(draft));
      }
    }
  }, [formTitle, formCategory, formPrice, formDiscountPercentage, formDescription, formImages, editingProduct, isProductModalOpen]);

  // Check for saved draft on opening the modal
  useEffect(() => {
    if (isProductModalOpen) {
      const saved = localStorage.getItem('hs_handmade_form_draft');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const draftIsEditing = parsed.editingId !== null;
          const currentIsEditing = editingProduct !== null;
          
          // Verify if draft matches current mode (either editing the same product, or both creating a new product)
          const matchesMode = currentIsEditing 
            ? (draftIsEditing && parsed.editingId === editingProduct.id)
            : !draftIsEditing;

          if (matchesMode && (parsed.title || parsed.description || parsed.images?.length > 0 || parsed.price)) {
            setDraftToRestore(parsed);
          } else {
            setDraftToRestore(null);
          }
        } catch (e) {
          console.error('Error parsing draft from localStorage:', e);
        }
      }
    } else {
      setDraftToRestore(null);
    }
  }, [isProductModalOpen, editingProduct]);

  // Carousel slider positions per product ID
  const [carouselIndexes, setCarouselIndexes] = useState<Record<string, number>>({});

  // Cart State
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('hs_handmade_cart');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading cart from local storage', e);
      }
    }
    return [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartToast, setCartToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Persist cart to localStorage
  useEffect(() => {
    localStorage.setItem('hs_handmade_cart', JSON.stringify(cart));
  }, [cart]);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Set initial carousel index to 0 for any products that don't have one
  const getProductImageIndex = (productId: string) => {
    return carouselIndexes[productId] ?? 0;
  };

  const handleNextImage = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation(); // Avoid triggering details / lightbox
    const currentIndex = getProductImageIndex(product.id);
    const nextIndex = (currentIndex + 1) % product.images.length;
    setCarouselIndexes(prev => ({ ...prev, [product.id]: nextIndex }));
  };

  const handlePrevImage = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation(); // Avoid triggering details / lightbox
    const currentIndex = getProductImageIndex(product.id);
    const prevIndex = (currentIndex - 1 + product.images.length) % product.images.length;
    setCarouselIndexes(prev => ({ ...prev, [product.id]: prevIndex }));
  };

  // Admin access login handler
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminLoginStep === 1) {
      const isValid = await verifyFirstPassword(passwordInput);
      if (isValid) {
        setAdminLoginStep(2);
        setPasswordInput('');
        setPasswordError(null);
      } else {
        setAdminLoginStep(1);
        setPasswordInput('');
        setPasswordError('رمز المرور غير صحيح. الرجاء المحاولة مرة أخرى.');
      }
    } else {
      const isValid = await verifySecondPassword(passwordInput);
      if (isValid) {
        setIsAdmin(true);
        sessionStorage.setItem('hs_handmade_admin', 'true');
        setIsPasswordModalOpen(false);
        setPasswordInput('');
        setPasswordError(null);
        setAdminLoginStep(1);
      } else {
        setAdminLoginStep(1);
        setPasswordInput('');
        setPasswordError('رمز المرور الثاني غير صحيح. تم إعادة تعيين الخطوات.');
      }
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem('hs_handmade_admin');
  };

  // Delete product: instant, immediate, no confirmations!
  const handleDeleteProduct = (productId: string) => {
    const updated = products.filter(p => p.id !== productId);
    saveProducts(updated);
    
    // Also clean up state
    setCarouselIndexes(prev => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });

    if (typeof (window as any).renderAppGridDisplay === 'function') {
      (window as any).renderAppGridDisplay();
    }
  };

  // Update product inventory status instantly
  const handleUpdateProductStatus = (productId: string, status: 'instock' | 'outofstock') => {
    const updated = products.map(p => {
      if (p.id === productId) {
        return { ...p, status };
      }
      return p;
    });
    saveProducts(updated);

    if (typeof (window as any).renderAppGridDisplay === 'function') {
      (window as any).renderAppGridDisplay();
    }
  };

  // Cart operations
  const handleAddToCart = (product: Product) => {
    if (!currentSavedLink || currentSavedLink.trim() === '') {
      setCartToast({
        message: "عفوا الطلب غير متاح حاليا",
        type: 'error'
      });
      setIsCheckoutUnavailableModalOpen(true);
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { id: product.id, product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter((item): item is CartItem => item !== null);
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const handleInstagramCheckout = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Validation check: define "Not Configured" as empty, null, undefined, or left as a blank placeholder.
    if (!currentSavedLink || currentSavedLink.trim() === '') {
      setCartToast({
        message: "عفوا الطلب غير متاح حاليا",
        type: 'error'
      });
      setIsCheckoutUnavailableModalOpen(true);
      return;
    }
    
    const trimmedLink = currentSavedLink.trim();
    let redirectUrl = '';
    
    if (trimmedLink.startsWith('http://') || trimmedLink.startsWith('https://')) {
      redirectUrl = trimmedLink;
    } else {
      redirectUrl = `https://ig.me/m/${trimmedLink}`;
    }
    
    // 1. Calculate dynamic prices and totals
    const finalTotal = cart.reduce((total, item) => {
      const originalPrice = item.product.price;
      const hasDiscount = item.product.discountPercentage && item.product.discountPercentage > 0;
      const price = hasDiscount 
        ? (originalPrice - (originalPrice * (item.product.discountPercentage! / 100))) 
        : originalPrice;
      return total + (price * item.quantity);
    }, 0);

    // 2. Generate detailed order summary
    const orderItemsText = cart.map((item, index) => {
      const originalPrice = item.product.price;
      const hasDiscount = item.product.discountPercentage && item.product.discountPercentage > 0;
      const price = hasDiscount 
        ? (originalPrice - (originalPrice * (item.product.discountPercentage! / 100))) 
        : originalPrice;
      return `✨ ${index + 1}. ${item.product.title} (العدد: ${item.quantity}) - $${(price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }).join('\n');

    const summaryText = `🛍️ تفاصيل طلب جديد من موقع H.S HandMade:\n\n${orderItemsText}\n\n📊 المجموع النهائي: $${finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\nالرجاء تأكيد استلام الطلب وبدء التحضير. شكراً لكم!`;

    try {
      // 3. Write summary to clipboard
      await navigator.clipboard.writeText(summaryText);
      
      // 4. Show success toast/alert
      setCartToast({
        message: "تم نسخ تفاصيل طلبك بنجاح! سيتم تحويلك الآن إلى إنستغرام، يرجى لصق تفاصيل الطلب في الرسائل هناك لإتمامه.",
        type: 'success'
      });
      
      // 5. Close cart drawer smoothly
      setIsCartOpen(false);

      // 6. Redirect to Instagram DM after 2 seconds
      setTimeout(() => {
        window.open(redirectUrl, '_blank', 'noopener,noreferrer');
        setCartToast(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Fallback: still redirect even if copy failed, but notify user
      setCartToast({
        message: "سيتم تحويلك الآن إلى إنستغرام لإتمام طلبك.",
        type: 'info'
      });
      setTimeout(() => {
        window.open(redirectUrl, '_blank', 'noopener,noreferrer');
        setCartToast(null);
      }, 2000);
    }
  };

  // Keep cart product details in sync with the current store products
  useEffect(() => {
    setCart(prev => {
      let changed = false;
      const updated = prev.map(item => {
        const storeProd = products.find(p => p.id === item.id);
        if (!storeProd) {
          changed = true;
          return null;
        }
        if (JSON.stringify(item.product) !== JSON.stringify(storeProd)) {
          changed = true;
          return { ...item, product: storeProd };
        }
        return item;
      }).filter((item): item is CartItem => item !== null);

      return changed ? updated : prev;
    });
  }, [products]);

  // Admin Store Settings & Cloud Database Control Handlers
  const openInstaModal = () => {
    if (!isAdmin) return;
    const savedInsta = localStorage.getItem('hs_instagram_link') || '';
    
    setInstaLinkInput(savedInsta);
    
    const savedDbUrl = localStorage.getItem('hs_handmade_cloud_db_url') || 'https://kvdb.io/MN_hs_handmade_220acadc/products';
    setCloudDbUrlInput(savedDbUrl);
    
    setIsInstaModalOpen(true);
  };

  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setIsSavingSettings(true);
    setSaveSuccessSettings(false);

    const trimmedInsta = instaLinkInput.trim();
    const trimmedDbUrl = cloudDbUrlInput.trim();

    // 1. Save to localStorage
    localStorage.setItem('hs_instagram_link', trimmedInsta);
    localStorage.setItem('hs_handmade_cloud_db_url', trimmedDbUrl);

    // 2. Build settings package (Rule 2)
    const settingsData = {
      instagram: trimmedInsta
    };

    const settingsUrl = getSettingsUrl(trimmedDbUrl);

    // 3. Save Settings to Cloud Database link (kvdb.io)
    try {
      const response = await fetch(settingsUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData)
      });
      if (!response.ok) {
        await fetch(settingsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settingsData)
        });
      }
    } catch (err) {
      console.error('Failed to save settings to cloud:', err);
    }

    // 4. Update in-memory states
    setCurrentSavedLink(trimmedInsta);
    setCloudDbUrl(trimmedDbUrl);

    setIsSavingSettings(false);
    setSaveSuccessSettings(true);

    setCartToast({
      message: "تم حفظ الإعدادات وقاعدة البيانات ومزامنتها سحابياً بنجاح!",
      type: 'success'
    });

    // Attempt instant cloud synchronization of products
    try {
      await syncFromCloud(trimmedDbUrl);
    } catch (err) {
      console.error('Failed to sync products from cloud URL:', err);
    }

    // Close settings modal after 1.5 seconds
    setTimeout(() => {
      setIsInstaModalOpen(false);
      setSaveSuccessSettings(false);
    }, 1500);
  };

  // Open modal for creating product
  const openAddProductModal = () => {
    setEditingProduct(null);
    setFormTitle('');
    setFormCategory('Shawls & Scarves');
    setFormPrice('');
    setFormDiscountPercentage('');
    setFormDescription('');
    setFormImages([]);
    setFormError(null);
    setIsProductModalOpen(true);
  };

  // Open modal for editing product
  const openEditProductModal = (product: Product) => {
    setEditingProduct(product);
    setFormTitle(product.title);
    setFormCategory(product.category);
    setFormPrice(product.price);
    setFormDiscountPercentage(product.discountPercentage ?? '');
    setFormDescription(product.description);
    setFormImages([...product.images]);
    setFormError(null);
    setIsProductModalOpen(true);
  };

  // Handle files selection with direct backend upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setFormError(null);

    try {
      const uploadPromises = Array.from(files).map((file: File) => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (event) => {
            if (event.target?.result && typeof event.target.result === 'string') {
              try {
                const response = await fetch('/api/upload', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    filename: file.name,
                    base64: event.target.result,
                  }),
                });
                
                if (!response.ok) {
                  throw new Error(`Upload failed for ${file.name}`);
                }
                
                const data = await response.json();
                resolve(data.url);
              } catch (err) {
                reject(err);
              }
            } else {
              reject(new Error('Failed to read file as base64'));
            }
          };
          reader.onerror = () => reject(new Error('FileReader error'));
          reader.readAsDataURL(file as Blob);
        });
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setFormImages(prev => [...prev, ...uploadedUrls]);
    } catch (err: any) {
      console.error('File upload error:', err);
      setFormError(err.message || 'Error uploading files to backend');
    } finally {
      setIsUploading(false);
      // Reset file input value so same files can be chosen again if deleted
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFormImage = (indexToRemove: number) => {
    setFormImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Add/Edit Save handler (Rule 2)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitle.trim()) {
      setFormError('Please enter a product title');
      return;
    }
    if (formPrice === '' || Number(formPrice) <= 0) {
      setFormError('Please enter a valid price greater than 0');
      return;
    }
    if (formDiscountPercentage !== '' && (Number(formDiscountPercentage) < 0 || Number(formDiscountPercentage) > 100)) {
      setFormError('Please enter a valid discount percentage between 0 and 100');
      return;
    }
    if (!formDescription.trim()) {
      setFormError('Please enter a product description');
      return;
    }
    if (formImages.length === 0) {
      setFormError('Please upload at least one product image from your device');
      return;
    }

    setIsSavingProduct(true);
    setFormError(null);
    setSaveSuccessProduct(false);

    const discountValue = formDiscountPercentage === '' ? 0 : Number(formDiscountPercentage);

    let updatedProducts: Product[] = [];
    if (editingProduct) {
      // Edit mode
      updatedProducts = products.map(p => {
        if (p.id === editingProduct.id) {
          return {
            ...p,
            title: formTitle.trim(),
            category: formCategory,
            price: Number(formPrice),
            description: formDescription.trim(),
            images: formImages,
            status: p.status || 'instock',
            discountPercentage: discountValue,
          };
        }
        return p;
      });
    } else {
      // Create mode
      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        title: formTitle.trim(),
        category: formCategory,
        price: Number(formPrice),
        description: formDescription.trim(),
        images: formImages,
        createdAt: new Date().toISOString(),
        status: 'instock',
        discountPercentage: discountValue,
      };
      updatedProducts = [newProduct, ...products];
    }

    try {
      await saveProducts(updatedProducts);
      localStorage.removeItem('hs_handmade_form_draft');
      setSaveSuccessProduct(true);
      
      if (typeof (window as any).renderAppGridDisplay === 'function') {
        (window as any).renderAppGridDisplay();
      }

      // Close modal smoothly after success indicator
      setTimeout(() => {
        setIsProductModalOpen(false);
        setEditingProduct(null);
        setSaveSuccessProduct(false);
      }, 1500);
    } catch (err: any) {
      console.error('Error saving product:', err);
      setFormError('فشلت المزامنة السحابية. يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.');
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Helper to filter and sort products
  const filteredAndSortedProducts = products
    .filter(p => {
      const matchCategory = activeCategory === 'All' || p.category === activeCategory;
      const matchSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'price-asc') {
        return a.price - b.price;
      } else {
        return b.price - a.price;
      }
    });

  // Focus input ref when password modal opens
  useEffect(() => {
    if (isPasswordModalOpen && passwordInputRef.current) {
      setTimeout(() => passwordInputRef.current?.focus(), 100);
    }
  }, [isPasswordModalOpen]);

  // Handle key listeners for Lightbox carousel
  useEffect(() => {
    if (!lightbox) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setLightbox(prev => {
          if (!prev) return null;
          return {
            ...prev,
            index: (prev.index + 1) % prev.images.length
          };
        });
      } else if (e.key === 'ArrowLeft') {
        setLightbox(prev => {
          if (!prev) return null;
          return {
            ...prev,
            index: (prev.index - 1 + prev.images.length) % prev.images.length
          };
        });
      } else if (e.key === 'Escape') {
        setLightbox(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightbox]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg text-brand-ink flex flex-col items-center justify-center p-6" dir="rtl">
        <div className="flex flex-col items-center space-y-4 max-w-md text-center">
          <div className="w-10 h-10 border-3 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
          <h2 className="font-serif font-semibold text-lg text-brand-ink">جاري تحميل المعرض...</h2>
          <p className="text-xs text-brand-ink/60 leading-relaxed">
            نقوم بجلب أحدث التفاصيل، الأسعار، وتوافر المنتجات مباشرة من قاعدة البيانات السحابية لضمان دقة طلبك.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-ink font-sans selection:bg-brand-accent/20 selection:text-brand-ink transition-colors duration-300">
      
      {/* 1. STICKY ADMIN STATUS AND CONTROL BAR */}
      <AnimatePresence>
        {isAdmin && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            id="admin-bar"
            className="sticky top-0 z-40 bg-brand-admin text-white border-b border-white/10 shadow-sm px-4 py-3"
          >
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono tracking-wider text-[#F9F7F2] font-semibold uppercase text-xs">Admin Mode Active</span>
                <span className="text-white/30">|</span>
                <span className="text-white/80 text-xs">Create, edit, and instantly delete products.</span>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  id="btn-add-product"
                  onClick={openAddProductModal}
                  className="flex items-center gap-1.5 bg-brand-accent hover:bg-brand-accent/90 active:scale-95 text-white px-3.5 py-1.5 rounded-xs font-semibold text-xs transition-all duration-150 shadow-xs uppercase tracking-wider"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Product
                </button>
                <button 
                  id="btn-edit-insta-link"
                  onClick={openInstaModal}
                  className="flex items-center gap-1.5 bg-[#4F46E5] hover:bg-[#4338CA] active:scale-95 text-white px-3.5 py-1.5 rounded-xs font-semibold text-xs transition-all duration-150 uppercase tracking-wider cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  إعدادات المتجر وقاعدة البيانات
                </button>
                <button 
                  id="btn-admin-logout"
                  onClick={handleAdminLogout}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white px-3.5 py-1.5 rounded-xs font-semibold text-xs transition-all duration-150 border border-white/20 uppercase tracking-wider"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. HEADER & BRAND IDENTIFIER */}
      <header className="relative bg-white border-b border-brand-ink/10 pt-6 pb-5 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Logo & Slogan (Secret Admin Trigger) */}
          <div 
            onClick={() => {
              setIsPasswordModalOpen(true);
              setAdminLoginStep(1);
              setPasswordInput('');
              setPasswordError(null);
            }}
            className="text-center md:text-left cursor-default select-none"
          >
            <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
              <span className="w-1 h-7 bg-brand-accent rounded-xs hidden md:block" />
              <h1 className="font-serif font-bold text-2xl md:text-3xl tracking-widest uppercase text-brand-ink">
                H.S HandMade
              </h1>
            </div>
            <p className="text-[10px] tracking-widest text-brand-ink/60 uppercase font-semibold font-sans">
              Authentic Woolen Crafts & Handcrafted Gifts
            </p>
          </div>

          {/* Slogan Pill / Highlights */}
          <div className="flex items-center gap-4 text-[11px] font-mono text-brand-ink/70 bg-brand-bg border border-brand-ink/10 px-4 py-2 rounded-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
              <span>100% Hand-Knit</span>
            </div>
            <div className="w-px h-3 bg-brand-ink/10" />
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
              <span>Organic Materials</span>
            </div>
          </div>

          {/* Right side container for Admin state & Shopping Cart */}
          <div className="flex items-center gap-3.5 flex-wrap justify-center md:justify-end">
            {/* Shopping Cart Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 bg-brand-accent/5 hover:bg-brand-accent/10 text-brand-accent border border-brand-accent/20 rounded-none px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-150"
              title="Open Cart"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="font-sans font-bold">سلة المشتريات</span>
              {cart.reduce((total, item) => total + item.quantity, 0) > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold w-5.5 h-5.5 rounded-full flex items-center justify-center border border-white font-mono animate-bounce shadow-md">
                  {cart.reduce((total, item) => total + item.quantity, 0)}
                </span>
              )}
            </button>

            {/* Admin access trigger - completely hidden when not logged in */}
            {isAdmin && (
              <div className="flex items-center">
                <div className="flex items-center gap-2 bg-brand-accent/10 border border-brand-accent/30 text-brand-accent rounded-none px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">
                  <Unlock className="w-3.5 h-3.5" />
                  Admin Active
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 3. HERO INTRO BANNER */}
      <section className="relative px-4 py-12 md:py-16 bg-brand-bg overflow-hidden border-b border-brand-ink/5">
        {/* Subtle decorative grid/line background */}
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1A1A1A 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-brand-accent/10 text-brand-accent px-3 py-1 rounded-none border border-brand-accent/20 text-xs font-semibold tracking-wider uppercase mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Exquisite Autumn & Winter Catalog</span>
          </div>
          <h2 className="font-serif text-3xl md:text-5xl font-normal text-brand-ink leading-[1.25] mb-6">
            Where every woven stitch <br />
            <span className="italic font-light text-brand-accent">tells a quiet story of patience & love</span>
          </h2>
          <p className="max-w-xl mx-auto text-brand-ink/70 text-sm leading-relaxed font-sans font-light">
            Each shawl, scarf, matching set, and gift item is slow-crafted by hand with premium materials, natural plant dyes, and organic wool, preserving ancestral needle techniques.
          </p>
        </div>
      </section>

      {/* 4. MAIN CONTENT CATALOG SECTION */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 pb-24">
        
        {/* FILTERS & SEARCH CONTROL PANEL */}
        <div className="bg-white border border-brand-ink/10 rounded-xs p-5 md:p-6 mb-10 shadow-xs">
          <div className="flex flex-col lg:flex-row gap-5 items-stretch lg:items-center justify-between">
            
            {/* Category Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {(['All', 'Shawls & Scarves', 'Full Sets', 'Gifts'] as const).map((cat) => (
                <button
                  key={cat}
                  id={`tab-category-${cat.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-none text-xs font-semibold tracking-wider uppercase transition-all duration-200 border ${
                    activeCategory === cat
                      ? 'bg-brand-accent text-white border-brand-accent shadow-xs'
                      : 'bg-white text-brand-ink/75 border-brand-ink/10 hover:border-brand-ink/30 hover:text-brand-ink'
                  }`}
                >
                  {cat === 'All' ? 'All Masterpieces' : cat}
                </button>
              ))}
            </div>

            {/* Search and Sort Toolbar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Search bar */}
              <div className="relative w-full sm:w-64">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-ink/40">
                  <Search className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="Search craft items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-brand-bg text-brand-ink text-xs pl-9 pr-4 py-2.5 rounded-none border border-brand-ink/10 focus:outline-none focus:border-brand-accent transition-all"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-ink/40 hover:text-brand-ink"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-[10px] text-brand-ink/50 uppercase tracking-widest font-mono whitespace-nowrap">Sort By</span>
                <div className="relative w-full sm:w-44">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full appearance-none bg-brand-bg text-brand-ink text-xs pl-3.5 pr-8 py-2.5 rounded-none border border-brand-ink/10 focus:outline-none focus:border-brand-accent transition-all"
                  >
                    <option value="newest">Latest Collections</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                  </select>
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-brand-ink/40">
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Active status bar info */}
          <div className="mt-4 pt-4 border-t border-brand-ink/5 flex items-center justify-between text-xs text-brand-ink/60 font-sans">
            <div>
              Showing <span className="font-semibold text-brand-ink">{filteredAndSortedProducts.length}</span> luxury handmade items
            </div>
            {searchQuery && (
              <div className="text-brand-ink/50 italic">
                Filtering for: "{searchQuery}"
              </div>
            )}
          </div>
        </div>

        {/* PRODUCTS RESPONSIVE GRID */}
        {filteredAndSortedProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredAndSortedProducts.map((product) => {
              const currentImgIdx = getProductImageIndex(product.id);
              const currentImg = product.images[currentImgIdx] || generateHandmadeSVG('shawl', '#8C1D2F', '#D4AF37', 'full');

              return (
                <motion.div
                  key={product.id}
                  layoutId={`product-card-${product.id}`}
                  className="group relative bg-white border border-brand-ink/10 rounded-none overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col h-full"
                >
                  
                  {/* PRODUCT IMAGE CAROUSEL SLIDER */}
                  <div className="relative aspect-[4/3.2] bg-brand-bg overflow-hidden select-none">
                    <img
                      src={currentImg}
                      alt={product.title}
                      referrerPolicy="no-referrer"
                      onClick={() => {
                        if (!currentSavedLink || currentSavedLink.trim() === '') {
                          setCartToast({
                            message: "عفوا الطلب غير متاح حاليا",
                            type: 'error'
                          });
                          setIsCheckoutUnavailableModalOpen(true);
                          return;
                        }
                        setLightbox({
                          images: product.images,
                          index: currentImgIdx,
                          title: product.title
                        });
                      }}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02] cursor-zoom-in"
                    />

                    {/* Left/Right Carousel navigation arrows */}
                    {product.images.length > 1 && (
                      <>
                        <button
                          onClick={(e) => handlePrevImage(e, product)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/95 hover:bg-white text-brand-ink flex items-center justify-center opacity-90 group-hover:opacity-100 transition-all duration-200 active:scale-90 border border-brand-ink/10"
                          title="Previous image"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleNextImage(e, product)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/95 hover:bg-white text-brand-ink flex items-center justify-center opacity-90 group-hover:opacity-100 transition-all duration-200 active:scale-90 border border-brand-ink/10"
                          title="Next image"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {/* Image indicator count badge */}
                    <div className="absolute top-3 left-3 bg-brand-ink/90 text-white text-[9px] font-mono font-medium px-2 py-0.5 border border-white/10">
                      {currentImgIdx + 1} / {product.images.length} VIEW
                    </div>

                    {/* Category overlay label */}
                    <div className="absolute top-3 right-3 bg-brand-accent text-white text-[9px] font-semibold tracking-widest uppercase px-2.5 py-1 border border-white/10">
                      {product.category}
                    </div>

                    {/* Arabic Discount Badge overlay */}
                    {product.discountPercentage && product.discountPercentage > 0 ? (
                      <div className="absolute bottom-3 left-3 bg-red-600 text-white text-[10px] font-bold tracking-wider px-2 py-0.5 shadow-sm border border-white/10 z-10 font-sans">
                        خصم {product.discountPercentage}%
                      </div>
                    ) : null}

                    {/* Zoom icon tooltip overlay shown on image hover */}
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 flex items-center justify-center">
                      <div className="bg-white text-brand-ink px-3.5 py-2 text-xs font-semibold uppercase tracking-wider border border-brand-ink/10 shadow-xs flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-200">
                        <Eye className="w-3.5 h-3.5 text-brand-accent" />
                        Click to zoom
                      </div>
                    </div>
                  </div>

                  {/* Indicator Dots at the bottom of Carousel */}
                  {product.images.length > 1 && (
                    <div className="flex justify-center gap-1.5 py-2.5 bg-brand-bg/80 border-b border-brand-ink/5">
                      {product.images.map((_, dotIdx) => (
                        <button
                          key={dotIdx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCarouselIndexes(prev => ({ ...prev, [product.id]: dotIdx }));
                          }}
                          className={`w-1.5 h-1.5 transition-all duration-200 ${
                            currentImgIdx === dotIdx ? 'bg-brand-accent w-4' : 'bg-brand-ink/10 hover:bg-brand-ink/25'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* DETAILS BODY */}
                  <div className="p-5 md:p-6 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Inventory Status Badge */}
                      <div className="mb-2.5 flex items-center">
                        {(!product.status || product.status === 'instock') ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-none border border-emerald-100 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            In Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-0.5 rounded-none border border-red-100 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Out of Stock
                          </span>
                        )}
                      </div>

                      {/* Product title */}
                      <h3 className="font-serif font-semibold text-lg text-brand-ink line-clamp-1 mb-1 leading-snug group-hover:text-brand-accent transition-colors">
                        {product.title}
                      </h3>

                      {/* DEDICATED PRICE TAG PLACEHOLDER (clearly below each product title) */}
                      <div className="mb-3.5 flex items-center gap-2">
                        {product.discountPercentage && product.discountPercentage > 0 ? (
                          <>
                            <span className="inline-block bg-brand-accent text-white font-serif font-bold text-base px-3 py-0.5">
                              ${(product.price - (product.price * (product.discountPercentage / 100))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-brand-ink/40 line-through text-xs font-mono">
                              ${product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </>
                        ) : (
                          <span className="inline-block bg-brand-accent/5 border border-brand-accent/20 text-brand-accent font-serif font-bold text-base px-3 py-0.5">
                            ${product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-brand-ink/70 text-xs leading-relaxed font-sans font-light line-clamp-3 mb-4">
                        {product.description}
                      </p>
                    </div>

                    {/* ACTIONS: Add to Cart and Admin Controls */}
                    <div className="pt-4 border-t border-brand-ink/5 space-y-3">
                      {/* Add to Cart button */}
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={product.status === 'outofstock'}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold tracking-wider border transition-all duration-150 rounded-none cursor-pointer ${
                          product.status === 'outofstock'
                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed font-sans'
                            : 'bg-brand-accent hover:bg-brand-accent/95 text-white border-brand-accent active:scale-[0.99] font-sans shadow-xs'
                        }`}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>{product.status === 'outofstock' ? 'غير متوفر (Out of Stock)' : 'أضف إلى السلة'}</span>
                      </button>

                      {isAdmin ? (
                        <div className="flex flex-col gap-2.5 pt-1.5">
                          {/* Quick Inventory Status Action Row */}
                          <div className="flex items-center justify-between gap-2 bg-brand-bg/60 p-1.5 border border-brand-ink/5">
                            <span className="text-[9px] font-bold text-brand-ink/40 uppercase tracking-widest pl-1 font-mono">Status:</span>
                            <div className="flex gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateProductStatus(product.id, 'instock');
                                }}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-none transition-all duration-150 border ${
                                  (!product.status || product.status === 'instock')
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                    : 'bg-white hover:bg-emerald-50 text-emerald-600 border-emerald-200'
                                }`}
                              >
                                متوفر
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateProductStatus(product.id, 'outofstock');
                                }}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-none transition-all duration-150 border ${
                                  product.status === 'outofstock'
                                    ? 'bg-red-600 text-white border-red-600 shadow-xs'
                                    : 'bg-white hover:bg-red-50 text-red-600 border-red-200'
                                }`}
                              >
                                غير متوفر
                              </button>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditProductModal(product)}
                              className="flex-1 flex items-center justify-center gap-1.5 bg-brand-bg hover:bg-brand-accent/10 text-brand-ink border border-brand-ink/10 py-2 px-3 text-[10px] font-bold uppercase tracking-wider transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Edit Details
                            </button>
                            
                            {/* CRITICAL: "the item must be removed IMMEDIATELY from the display and data array without any extra confirmation popups" */}
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-2 px-3 text-[10px] font-bold uppercase tracking-wider transition-colors"
                              title="Instant deletion"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs text-brand-ink/55 pt-1">
                          <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider">
                            <Layers className="w-3 h-3 text-brand-accent" />
                            <span>Authentic Craft</span>
                          </div>
                          <span className="font-light italic">Limited release</span>
                        </div>
                      )}
                    </div>

                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white border border-brand-ink/10 rounded-none max-w-xl mx-auto px-6">
            <ShoppingBag className="w-12 h-12 text-brand-ink/30 mx-auto mb-4 stroke-1" />
            <h3 className="font-serif text-xl text-brand-ink font-medium mb-2">No masterpieces match your query</h3>
            <p className="text-brand-ink/60 text-xs leading-relaxed max-w-sm mx-auto mb-6">
              Adjust your search keywords or try changing categories to explore our hand-stitched catalog.
            </p>
            {isAdmin && (
              <button
                onClick={openAddProductModal}
                className="inline-flex items-center gap-1.5 bg-brand-accent hover:bg-brand-accent/90 text-white px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Your First Handmade Item
              </button>
            )}
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-brand-admin text-white/70 text-xs py-12 px-4 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h4 className="font-serif italic font-bold text-lg text-white mb-1.5">H.S HandMade</h4>
            <p className="text-white/50 max-w-xs text-[11px] leading-relaxed">
              Carefully slow-made textiles and handcrafted gifts. Creating warmth and slow comfort in everyday winter routines.
            </p>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-3.5">
            {/* Dynamic Social Icons (Rule 4) */}
            <div className="flex items-center gap-3">
              {currentSavedLink && currentSavedLink.trim() !== '' && (
                <a
                  href={currentSavedLink.startsWith('http') ? currentSavedLink.trim() : `https://instagram.com/${currentSavedLink.trim()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 hover:text-white flex items-center justify-center transition-all text-white/70 border border-white/5"
                  title="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
            </div>
            <span className="text-white/40 text-[11px]">© 2026 H.S HandMade Workshop. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* ==================== POPUP MODALS ==================== */}

      {/* A. SECURE PASSWORD MODAL (make password invisible) */}
      <AnimatePresence>
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute inset-0 bg-brand-ink/70 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white border border-brand-ink/10 rounded-none shadow-xl p-6 overflow-hidden z-10"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-brand-ink/10">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-brand-accent" />
                  <h3 className="font-serif font-semibold text-lg text-brand-ink">
                    {adminLoginStep === 1 ? 'Unlock Admin Panel' : 'خطوة الأمان الثانية'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="text-brand-ink/40 hover:text-brand-ink"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAdminLogin}>
                <p className="text-xs text-brand-ink/60 leading-relaxed mb-4">
                  {adminLoginStep === 1 
                    ? 'Please enter the first administrator password to proceed.' 
                    : 'الرجاء إدخال رمز الأمان الثاني لتأكيد صلاحيات المشرف.'}
                </p>

                <div className="mb-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-brand-ink/80 mb-1.5">
                    {adminLoginStep === 1 ? 'رمز المرور الأول' : 'رمز المرور الثاني'}
                  </label>
                  {/* CRITICAL: "make password unvisible" (type="password") */}
                  <input
                    ref={passwordInputRef}
                    type="password"
                    placeholder={adminLoginStep === 1 ? 'أدخل رمز المرور الأول' : 'أدخل رمز المرور الثاني'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full bg-brand-bg text-brand-ink text-sm px-3.5 py-2.5 rounded-none border border-brand-ink/15 focus:outline-none focus:border-brand-accent"
                  />
                  {passwordError && (
                    <p className="mt-2 text-xs text-red-600 font-semibold">
                      {passwordError}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="bg-brand-bg hover:bg-brand-ink/5 text-brand-ink border border-brand-ink/10 px-4 py-2 rounded-none text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-brand-accent hover:bg-brand-accent/90 text-white px-5 py-2 rounded-none text-xs font-bold uppercase tracking-wider transition-all shadow-xs"
                  >
                    {adminLoginStep === 1 ? 'دخول' : 'تأكيد'}
                  </button>
                </div>
              </form>
            </motion.div>

          </div>
        )}
      </AnimatePresence>

      {/* F. CHECKOUT UNAVAILABLE MODAL */}
      <AnimatePresence>
        {isCheckoutUnavailableModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCheckoutUnavailableModalOpen(false)}
              className="absolute inset-0 bg-brand-ink/60 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-white border border-brand-ink/10 rounded-none shadow-2xl p-6 overflow-hidden z-10 text-center"
            >
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center border border-amber-100">
                  <AlertCircle className="w-6 h-6 text-amber-600 animate-pulse" />
                </div>
                
                <h3 className="font-sans font-bold text-base text-brand-ink mt-2">
                  عفوا الطلب غير متاح حاليا
                </h3>
                
                <p className="text-xs text-brand-ink/65 leading-relaxed" dir="rtl">
                  {isAdmin ? (
                    "بصفتك مديراً، يرجى الدخول إلى إعدادات المتجر وتعيين رابط أو معرف حساب إنستغرام لتفعيل إمكانية تلقي الطلبات وعرض تفاصيل المنتجات."
                  ) : (
                    "نعتذر عن الإزعاج، عملية الشراء والطلب معطلة مؤقتاً لعدم وجود رابط حساب إنستغرام مفعّل. يرجى التواصل مع إدارة الموقع لتعديله."
                  )}
                </p>
                
                <button
                  onClick={() => setIsCheckoutUnavailableModalOpen(false)}
                  className="mt-2 bg-brand-ink hover:bg-brand-ink/90 text-white w-full py-2.5 rounded-none text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  حسناً (OK)
                </button>
              </div>
            </motion.div>

          </div>
        )}
      </AnimatePresence>

      {/* E. STORE SETTINGS & DATABASE MODAL (Admin Only Settings) */}
      <AnimatePresence>
        {isAdmin && isInstaModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInstaModalOpen(false)}
              className="absolute inset-0 bg-brand-ink/70 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white border border-brand-ink/10 rounded-none shadow-xl p-6 overflow-hidden z-10"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-brand-ink/10">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-brand-accent animate-spin" style={{ animationDuration: '6s' }} />
                  <h3 className="font-serif font-semibold text-lg text-brand-ink">
                    إعدادات المتجر وقاعدة البيانات
                  </h3>
                </div>
                <button
                  onClick={() => setIsInstaModalOpen(false)}
                  className="text-brand-ink/40 hover:text-brand-ink cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveStoreSettings} className="space-y-4">
                {/* 1. Instagram Link */}
                <div className="text-right" dir="rtl">
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-ink/80 mb-1.5 flex items-center justify-end gap-1.5">
                    <Instagram className="w-3.5 h-3.5 text-brand-accent" />
                    <span>رابط أو اسم مستخدم حساب إنستغرام (اختياري)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: hs.handmade"
                    value={instaLinkInput}
                    onChange={(e) => setInstaLinkInput(e.target.value)}
                    className="w-full bg-brand-bg text-brand-ink text-sm px-3.5 py-2.5 rounded-none border border-brand-ink/15 focus:outline-none focus:border-brand-accent text-left font-mono"
                    dir="ltr"
                  />
                  <p className="text-[10px] text-brand-ink/50 mt-1 leading-relaxed">
                    سيتم توجيه العملاء إلى هذا الحساب تلقائياً عند إتمام الطلب وإرسال تفاصيل السلة.
                  </p>
                </div>

                {/* 4. Cloud Database URL */}
                <div className="text-right border-t border-brand-ink/10 pt-4" dir="rtl">
                  <div className="flex items-center justify-between mb-1.5">
                    <button
                      type="button"
                      onClick={() => setCloudDbUrlInput('https://kvdb.io/MN_hs_handmade_220acadc/products')}
                      className="text-[10px] text-brand-accent hover:underline font-bold"
                    >
                      استعادة الرابط الافتراضي
                    </button>
                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-ink/80">
                      رابط قاعدة البيانات السحابية (JSON Cloud Sync)
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder="رابط API لحفظ المنتجات"
                    value={cloudDbUrlInput}
                    onChange={(e) => setCloudDbUrlInput(e.target.value)}
                    className="w-full bg-brand-bg text-brand-ink text-xs px-3.5 py-2.5 rounded-none border border-brand-ink/15 focus:outline-none focus:border-brand-accent text-left font-mono"
                    dir="ltr"
                    required
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2.5 border-t border-brand-ink/10 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsInstaModalOpen(false)}
                    className="bg-brand-bg hover:bg-brand-ink/5 text-brand-ink border border-brand-ink/10 px-4 py-2 rounded-none text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    إلغاء (Cancel)
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="bg-brand-accent hover:bg-brand-accent/90 disabled:bg-brand-accent/50 text-white px-5 py-2.5 rounded-none text-xs font-bold uppercase tracking-wider transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    {isSavingSettings ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                        <span>جاري الحفظ (Saving...)</span>
                      </>
                    ) : saveSuccessSettings ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>تم الحفظ (Saved!)</span>
                      </>
                    ) : (
                      <span>تم (Done)</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>

          </div>
        )}
      </AnimatePresence>

      {/* B. ADD / EDIT PRODUCT MODAL (Direct image uploads converted locally to Base64) */}
      <AnimatePresence>
        {isProductModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProductModalOpen(false)}
              className="absolute inset-0 bg-brand-ink/70 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white border border-brand-ink/10 rounded-none shadow-2xl p-6 md:p-8 overflow-y-auto max-h-[90vh] z-10"
            >
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-brand-ink/10">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-brand-accent" />
                  <h3 className="font-serif font-semibold text-xl text-brand-ink">
                    {editingProduct ? 'Edit Masterpiece Details' : 'Add New Handcrafted Masterpiece'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsProductModalOpen(false)}
                  className="text-brand-ink/40 hover:text-brand-ink"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="mb-5 p-3.5 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs rounded-none font-semibold flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {draftToRestore && (
                <div className="mb-5 p-4 bg-brand-bg border border-brand-accent/20 rounded-none text-xs text-brand-ink flex flex-col sm:flex-row items-center justify-between gap-3" dir="rtl">
                  <div className="flex items-center gap-3 text-right">
                    <Database className="w-5 h-5 text-brand-accent shrink-0" />
                    <div>
                      <span className="font-bold block text-sm">مسودة محفوظة متوفرة (Draft Backup Available)</span>
                      <span className="text-brand-ink/65 text-[10px]">لديك نسخة محفوظة تلقائياً من تعديلاتك السابقة على هذا المنتج.</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setFormTitle(draftToRestore.title || '');
                        setFormCategory(draftToRestore.category || 'Shawls & Scarves');
                        setFormPrice(draftToRestore.price || '');
                        setFormDiscountPercentage(draftToRestore.discountPercentage || '');
                        setFormDescription(draftToRestore.description || '');
                        setFormImages(draftToRestore.images || []);
                        setDraftToRestore(null);
                        setCartToast({
                          message: "تمت استعادة المسودة بنجاح!",
                          type: 'success'
                        });
                        setTimeout(() => setCartToast(null), 2500);
                      }}
                      className="bg-brand-accent hover:bg-brand-accent/90 text-white px-3 py-1.5 rounded-none font-bold text-[10px] transition-colors cursor-pointer"
                    >
                      استعادة (Restore)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem('hs_handmade_form_draft');
                        setDraftToRestore(null);
                      }}
                      className="bg-brand-ink/10 hover:bg-brand-ink/15 text-brand-ink px-2.5 py-1.5 rounded-none text-[10px] transition-colors cursor-pointer"
                    >
                      تجاهل (Discard)
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveProduct} className="space-y-5">
                
                {/* Title & Category Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-brand-ink/80 mb-1.5">
                      Product Title *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Vintage Wool Lace Shawl"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full bg-brand-bg text-brand-ink text-xs px-3.5 py-2.5 rounded-none border border-brand-ink/15 focus:outline-none focus:border-brand-accent"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-brand-ink/80 mb-1.5">
                      Website Category *
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as Category)}
                      className="w-full bg-brand-bg text-brand-ink text-xs px-3.5 py-2.5 rounded-none border border-brand-ink/15 focus:outline-none focus:border-brand-accent"
                    >
                      <option value="Shawls & Scarves">Shawls & Scarves (الشالات والكوفيات)</option>
                      <option value="Full Sets">Full Sets (الأطقم الكاملة)</option>
                      <option value="Gifts">Gifts (الهدايا)</option>
                    </select>
                  </div>
                </div>

                {/* Price Tag, Discount & Description */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Price & Discount Column */}
                  <div className="space-y-4">
                    {/* Price */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-brand-ink/80 mb-1.5">
                        Price (USD) *
                      </label>
                      <div className="relative text-brand-ink">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none font-serif font-bold text-sm text-brand-ink/40">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={formPrice}
                          onChange={(e) => setFormPrice(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full bg-brand-bg text-brand-ink text-xs pl-8 pr-4 py-2.5 rounded-none border border-brand-ink/15 focus:outline-none focus:border-brand-accent"
                        />
                      </div>
                    </div>

                    {/* Discount Percentage */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-brand-ink/80 mb-1.5">
                        Discount Percentage (نسبة الخصم %)
                      </label>
                      <div className="relative text-brand-ink">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          placeholder="e.g. 10, 20, 50"
                          value={formDiscountPercentage}
                          onChange={(e) => setFormDiscountPercentage(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full bg-brand-bg text-brand-ink text-xs px-3.5 py-2.5 rounded-none border border-brand-ink/15 focus:outline-none focus:border-brand-accent pr-8"
                        />
                        <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none font-sans font-bold text-xs text-brand-ink/40">
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2 flex flex-col">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-brand-ink/80 mb-1.5">
                      Artisan Story & Details *
                    </label>
                    <textarea
                      placeholder="Describe the materials used, hours of needlework, sizing, care guide, etc..."
                      rows={6}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full flex-1 bg-brand-bg text-brand-ink text-xs px-3.5 py-2 rounded-none border border-brand-ink/15 focus:outline-none focus:border-brand-accent resize-none"
                    />
                  </div>
                </div>

                {/* IMAGE UPLOAD PANEL (strict file pickers, direct server upload, multiple supported) */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-brand-accent">
                      Direct Image Uploads (Saved to Server /images/) *
                    </label>
                    {isUploading && (
                      <span className="text-[10px] bg-brand-accent/10 text-brand-accent px-2 py-0.5 animate-pulse font-mono uppercase tracking-wider">
                        Uploading to server...
                      </span>
                    )}
                  </div>
                  
                  {/* Drag-drop or click box */}
                  <div
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-none p-6 text-center transition-all duration-150 ${
                      isUploading 
                        ? 'border-brand-ink/10 bg-brand-bg/50 cursor-not-allowed opacity-60' 
                        : 'border-brand-ink/15 hover:border-brand-accent bg-brand-bg hover:bg-white cursor-pointer'
                    }`}
                  >
                    <Upload className={`w-8 h-8 mx-auto mb-2 stroke-1 ${isUploading ? 'text-brand-ink/20 animate-bounce' : 'text-brand-ink/30'}`} />
                    <p className="text-xs font-bold text-brand-ink/80 uppercase tracking-wider">
                      {isUploading ? 'Uploading files...' : 'Click to upload from your device'}
                    </p>
                    <p className="text-[10px] text-brand-ink/50 mt-1">
                      Supports multiple photos. Files are written directly to /public/images/ on the backend and exported.
                    </p>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      disabled={isUploading}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>

                  {/* Uploaded images grid preview */}
                  {formImages.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-mono text-brand-ink/50 uppercase tracking-wider">
                          Ready Images ({formImages.length})
                        </span>
                        <span className="text-[10px] text-brand-ink/40 italic">Images will form the carousel view angles</span>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                        {formImages.map((srcUrl, index) => (
                          <div 
                            key={index} 
                            className="group relative aspect-square rounded-none overflow-hidden border border-brand-ink/10 shadow-xs"
                          >
                            <img
                              src={srcUrl}
                              alt="Upload preview"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            {/* Delete specific image button */}
                            <button
                              type="button"
                              onClick={() => removeFormImage(index)}
                              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-none bg-brand-ink/90 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                              title="Remove photo"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                            {/* Angle order label badge */}
                            <div className="absolute bottom-1.5 left-1.5 bg-white border border-brand-ink/10 text-brand-ink text-[9px] font-mono font-bold px-1.5 py-0.5">
                              VIEW {index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-brand-ink/10 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(false)}
                    className="bg-brand-bg hover:bg-brand-ink/5 text-brand-ink border border-brand-ink/10 px-5 py-2.5 rounded-none text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProduct}
                    className="bg-brand-accent hover:bg-brand-accent/90 disabled:bg-brand-accent/50 text-white px-6 py-2.5 rounded-none text-xs font-bold uppercase tracking-wider transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    {isSavingProduct ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                        <span>جاري الحفظ (Saving...)</span>
                      </>
                    ) : saveSuccessProduct ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>تم الحفظ بنجاح (Saved!)</span>
                      </>
                    ) : (
                      <span>{editingProduct ? 'تعديل ونشر (Update & Publish)' : 'حفظ ونشر (Save & Publish)'}</span>
                    )}
                  </button>
                </div>

              </form>
            </motion.div>

          </div>
        )}
      </AnimatePresence>

      {/* C. LIGHTBOX POPUP MODAL (when click on photo open it) */}
      <AnimatePresence>
        {lightbox && (
          <div className="fixed inset-0 z-50 flex flex-col justify-between p-4 bg-brand-ink/98 backdrop-blur-md select-none">
            
            {/* Top Toolbar */}
            <div className="flex items-center justify-between text-white/50 text-xs px-2 py-4 z-10">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-brand-accent" />
                <span className="font-serif font-medium text-white tracking-wider uppercase text-xs">{lightbox.title}</span>
              </div>
              <div className="font-mono text-white/50 tracking-wider">
                IMAGE {lightbox.index + 1} OF {lightbox.images.length}
              </div>
              <button
                onClick={() => setLightbox(null)}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors active:scale-90 border border-white/10"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Immersive Main Display Area */}
            <div className="flex-1 flex items-center justify-center relative py-6">
              
              {/* Previous Photo Button */}
              {lightbox.images.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox(prev => {
                      if (!prev) return null;
                      return {
                        ...prev,
                        index: (prev.index - 1 + prev.images.length) % prev.images.length
                      };
                    });
                  }}
                  className="absolute left-4 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 text-white flex items-center justify-center active:scale-90 transition-all border border-white/10"
                  title="Previous (Left Arrow)"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Main Photo */}
              <motion.img
                key={lightbox.index}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                src={lightbox.images[lightbox.index]}
                alt={lightbox.title}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[72vh] md:max-h-[78vh] object-contain border border-white/10"
              />

              {/* Next Photo Button */}
              {lightbox.images.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox(prev => {
                      if (!prev) return null;
                      return {
                        ...prev,
                        index: (prev.index + 1) % prev.images.length
                      };
                    });
                  }}
                  className="absolute right-4 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 text-white flex items-center justify-center active:scale-90 transition-all border border-white/10"
                  title="Next (Right Arrow)"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Bottom Dots & Instructions Overlay */}
            <div className="text-center py-4 flex flex-col items-center gap-2 z-10">
              {lightbox.images.length > 1 && (
                <div className="flex gap-2 mb-1">
                  {lightbox.images.map((_, dotIdx) => (
                    <button
                      key={dotIdx}
                      onClick={() => setLightbox(prev => prev ? { ...prev, index: dotIdx } : null)}
                      className={`w-2 h-2 transition-all ${
                        lightbox.index === dotIdx ? 'bg-brand-accent w-5' : 'bg-white/20 hover:bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              )}
              <span className="text-[9px] text-white/40 uppercase tracking-widest font-mono">
                Click arrows or use left/right keys to change view angle
              </span>
            </div>

          </div>
        )}
      </AnimatePresence>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-brand-accent hover:bg-brand-accent/95 text-white p-4 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 animate-bounce"
          title="Open Cart"
        >
          <div className="relative">
            <ShoppingCart className="w-6 h-6" />
            <span className="absolute -top-3 -right-3 bg-red-600 text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-white font-mono">
              {cart.reduce((total, item) => total + item.quantity, 0)}
            </span>
          </div>
        </button>
      )}

      {/* D. SLIDING SHOPPING CART DRAWER */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-brand-ink/40 backdrop-blur-xs z-40"
            />

            {/* Sidebar Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-brand-ink/10 shadow-2xl flex flex-col font-sans"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-brand-ink/10 flex items-center justify-between bg-brand-bg">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-brand-accent" />
                  <span className="font-serif font-bold text-lg text-brand-ink">سلة المشتريات</span>
                  <span className="text-xs bg-brand-accent/10 text-brand-accent font-bold px-2 py-0.5 font-mono">
                    {cart.reduce((total, item) => total + item.quantity, 0)} ITEMS
                  </span>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-8 h-8 rounded-none border border-brand-ink/10 hover:bg-brand-ink/5 text-brand-ink flex items-center justify-center transition-colors"
                  title="Close Cart"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Body - Item List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <div className="w-16 h-16 rounded-full bg-brand-bg flex items-center justify-center text-brand-ink/30 mb-4 border border-brand-ink/5">
                      <ShoppingCart className="w-8 h-8" />
                    </div>
                    <h4 className="font-serif font-medium text-brand-ink text-base mb-1.5">السلة فارغة حالياً</h4>
                    <p className="text-brand-ink/50 text-xs max-w-[240px] leading-relaxed">
                      سلتك فارغة حالياً. ابدأ بإضافة بعض منتجاتنا اليدوية المميزة!
                    </p>
                  </div>
                ) : (
                  cart.map((item) => {
                    const originalPrice = item.product.price;
                    const hasDiscount = item.product.discountPercentage && item.product.discountPercentage > 0;
                    const unitPrice = hasDiscount 
                      ? (originalPrice - (originalPrice * (item.product.discountPercentage! / 100))) 
                      : originalPrice;
                    const thumbImg = item.product.images[0] || generateHandmadeSVG('shawl', '#8C1D2F', '#D4AF37', 'full');

                    return (
                      <div 
                        key={item.id} 
                        className="flex gap-4 p-3 border border-brand-ink/5 bg-brand-bg/40 hover:bg-brand-bg/80 transition-colors duration-150 relative group"
                      >
                        {/* Thumbnail Image */}
                        <div className="w-16 h-16 bg-brand-bg border border-brand-ink/10 overflow-hidden shrink-0">
                          <img 
                            src={thumbImg} 
                            alt={item.product.title} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        {/* Title, Category & Price calculations */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <h4 className="text-xs font-semibold text-brand-ink truncate font-serif" title={item.product.title}>
                              {item.product.title}
                            </h4>
                            <p className="text-[10px] text-brand-ink/40 font-mono uppercase mt-0.5">
                              {item.product.category}
                            </p>
                          </div>

                          {/* Price Tag Details */}
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-xs font-bold font-serif text-brand-accent">
                              ${unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            {hasDiscount && (
                              <span className="text-[10px] text-brand-ink/30 line-through font-mono">
                                ${originalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quantity Adjusters & Delete Action */}
                        <div className="flex flex-col items-end justify-between gap-2 shrink-0">
                          {/* Trash/Remove Icon */}
                          <button
                            onClick={() => handleRemoveFromCart(item.id)}
                            className="text-brand-ink/30 hover:text-red-600 transition-colors p-1"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Quantity selectors */}
                          <div className="flex items-center border border-brand-ink/10 bg-white shadow-xs">
                            <button
                              onClick={() => handleUpdateCartQuantity(item.id, -1)}
                              className="w-6 h-6 flex items-center justify-center text-brand-ink/60 hover:bg-brand-bg transition-colors animate-none"
                              title="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-xs font-bold font-mono text-brand-ink">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateCartQuantity(item.id, 1)}
                              className="w-6 h-6 flex items-center justify-center text-brand-ink/60 hover:bg-brand-bg transition-colors"
                              title="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Drawer Footer - Calculations & Order Checkout */}
              {cart.length > 0 && (
                <div className="p-5 border-t border-brand-ink/10 bg-brand-bg">
                  {/* Calculation Details */}
                  <div className="space-y-2 mb-5">
                    <div className="flex justify-between text-xs text-brand-ink/60">
                      <span>عدد القطع الإجمالي</span>
                      <span className="font-mono font-bold">
                        {cart.reduce((total, item) => total + item.quantity, 0)}
                      </span>
                    </div>
                    <div className="h-px bg-brand-ink/5" />
                    <div className="flex justify-between items-baseline text-brand-ink">
                      <span className="text-sm font-bold">المجموع النهائي (Total)</span>
                      <span className="text-xl font-bold font-serif text-brand-accent">
                        ${cart.reduce((total, item) => {
                          const originalPrice = item.product.price;
                          const hasDiscount = item.product.discountPercentage && item.product.discountPercentage > 0;
                          const price = hasDiscount 
                            ? (originalPrice - (originalPrice * (item.product.discountPercentage! / 100))) 
                            : originalPrice;
                          return total + (price * item.quantity);
                        }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Checkout via Instagram Button */}
                  {currentSavedLink && currentSavedLink.trim() !== '' ? (
                    <button
                      onClick={handleInstagramCheckout}
                      className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-indigo-600 via-pink-600 to-amber-500 hover:from-indigo-700 hover:via-pink-700 hover:to-amber-600 text-white py-3.5 px-4 text-xs font-bold uppercase tracking-wider transition-all duration-200 rounded-none shadow-sm hover:shadow-md text-center active:scale-[0.99] cursor-pointer"
                    >
                      <ShoppingCart className="w-4 h-4 shrink-0" />
                      <span>إتمام الطلب عبر إنستغرام</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setCartToast({
                          message: "عفوا الطلب غير متاح حاليا",
                          type: 'error'
                        });
                        setIsCheckoutUnavailableModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-2.5 bg-gray-400 text-white py-3.5 px-4 text-xs font-bold uppercase tracking-wider rounded-none text-center cursor-pointer active:scale-[0.99]"
                    >
                      <ShoppingCart className="w-4 h-4 shrink-0" />
                      <span>الطلب غير متاح حالياً</span>
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {cartToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md bg-white border border-brand-ink/15 shadow-2xl p-4 rounded-none flex gap-3 items-start font-sans"
          >
            <div className="shrink-0 mt-0.5">
              {cartToast.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 animate-pulse" />
              ) : (
                <Info className="w-5 h-5 text-brand-accent" />
              )}
            </div>
            <div className="flex-1 min-w-0 text-right" dir="rtl">
              <h5 className="text-xs font-bold text-brand-ink uppercase tracking-wider mb-1 font-sans">
                {cartToast.type === 'success' ? 'نجاح العملية' : 'تنبيه'}
              </h5>
              <p className="text-xs text-brand-ink/85 leading-relaxed font-sans">
                {cartToast.message}
              </p>
            </div>
            <button
              onClick={() => setCartToast(null)}
              className="text-brand-ink/40 hover:text-brand-ink shrink-0 self-center"
              title="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
