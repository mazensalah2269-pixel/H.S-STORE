/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { Product, Category } from './types';
import { getInitialProducts, generateHandmadeSVG } from './utils';

export default function App() {
  // Load products from localStorage or use defaults
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('hs_handmade_products');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading products from local storage', e);
      }
    }
    return getInitialProducts();
  });

  // Persist products to localStorage
  useEffect(() => {
    localStorage.setItem('hs_handmade_products', JSON.stringify(products));
  }, [products]);

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
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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
  const [formDescription, setFormDescription] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Carousel slider positions per product ID
  const [carouselIndexes, setCarouselIndexes] = useState<Record<string, number>>({});

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
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '0000') {
      setIsAdmin(true);
      sessionStorage.setItem('hs_handmade_admin', 'true');
      setIsPasswordModalOpen(false);
      setPasswordInput('');
      setPasswordError(null);
    } else {
      setPasswordError('Incorrect password. Please try again.');
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem('hs_handmade_admin');
  };

  // Delete product: instant, immediate, no confirmations!
  const handleDeleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
    // Also clean up state
    setCarouselIndexes(prev => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  };

  // Open modal for creating product
  const openAddProductModal = () => {
    setEditingProduct(null);
    setFormTitle('');
    setFormCategory('Shawls & Scarves');
    setFormPrice('');
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
    setFormDescription(product.description);
    setFormImages([...product.images]);
    setFormError(null);
    setIsProductModalOpen(true);
  };

  // Handle files selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const loadedBase64s: string[] = [];
    let processedCount = 0;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && typeof event.target.result === 'string') {
          loadedBase64s.push(event.target.result);
        }
        processedCount++;
        if (processedCount === files.length) {
          setFormImages(prev => [...prev, ...loadedBase64s]);
          // Reset file input value so same files can be chosen again if deleted
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };
      reader.readAsDataURL(file as Blob);
    });
  };

  const removeFormImage = (indexToRemove: number) => {
    setFormImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Add/Edit Save handler
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitle.trim()) {
      setFormError('Please enter a product title');
      return;
    }
    if (formPrice === '' || Number(formPrice) <= 0) {
      setFormError('Please enter a valid price greater than 0');
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

    if (editingProduct) {
      // Edit mode
      setProducts(prev => prev.map(p => {
        if (p.id === editingProduct.id) {
          return {
            ...p,
            title: formTitle.trim(),
            category: formCategory,
            price: Number(formPrice),
            description: formDescription.trim(),
            images: formImages,
          };
        }
        return p;
      }));
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
      };
      setProducts(prev => [newProduct, ...prev]);
    }

    setIsProductModalOpen(false);
    setEditingProduct(null);
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
          
          {/* Logo & Slogan */}
          <div className="text-center md:text-left">
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

          {/* Admin access trigger */}
          <div className="flex items-center">
            {!isAdmin ? (
              <button
                id="btn-admin-access"
                onClick={() => setIsPasswordModalOpen(true)}
                className="group flex items-center gap-2 text-brand-ink/80 hover:text-white hover:bg-brand-ink bg-transparent active:scale-98 border border-brand-ink rounded-none px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-150"
              >
                <Lock className="w-3.5 h-3.5 text-brand-ink/40 group-hover:text-white transition-colors" />
                Admin Access
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-brand-accent/10 border border-brand-accent/30 text-brand-accent rounded-none px-4 py-2 text-xs font-semibold uppercase tracking-wider">
                <Unlock className="w-3.5 h-3.5" />
                Admin Active
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
                      onClick={() => setLightbox({
                        images: product.images,
                        index: currentImgIdx,
                        title: product.title
                      })}
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
                      {/* Product title */}
                      <h3 className="font-serif font-semibold text-lg text-brand-ink line-clamp-1 mb-1 leading-snug group-hover:text-brand-accent transition-colors">
                        {product.title}
                      </h3>

                      {/* DEDICATED PRICE TAG PLACEHOLDER (clearly below each product title) */}
                      <div className="mb-3.5">
                        <span className="inline-block bg-brand-accent/5 border border-brand-accent/20 text-brand-accent font-serif font-bold text-base px-3 py-0.5">
                          ${product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-brand-ink/70 text-xs leading-relaxed font-sans font-light line-clamp-3 mb-4">
                        {product.description}
                      </p>
                    </div>

                    {/* ADMIN ACTIONS: Protected and displayed only when isAdmin is active */}
                    <div className="pt-4 border-t border-brand-ink/5">
                      {isAdmin ? (
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
                      ) : (
                        <div className="flex items-center justify-between text-xs text-brand-ink/55">
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
          
          <div className="flex flex-wrap items-center justify-center gap-6">
            <span className="text-white/20">|</span>
            <span className="text-white/50">Default Password: <code className="bg-white/10 px-1.5 py-0.5 rounded text-white font-mono text-[11px]">0000</code></span>
            <span className="text-white/20">|</span>
            <span className="text-white/60">© 2026 H.S HandMade Workshop. All rights reserved.</span>
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
                  <h3 className="font-serif font-semibold text-lg text-brand-ink">Unlock Admin Panel</h3>
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
                  Please enter the shop administrator password. Action capabilities like adding new products or deleting products instantly will be unlocked.
                </p>

                <div className="mb-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-brand-ink/80 mb-1.5">
                    Administrator Password
                  </label>
                  {/* CRITICAL: "make password unvisible" (type="password") */}
                  <input
                    ref={passwordInputRef}
                    type="password"
                    placeholder="Enter password..."
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
                    Unlock
                  </button>
                </div>
              </form>

              <div className="mt-6 pt-4 border-t border-brand-ink/10 text-[11px] text-brand-ink/40 text-center">
                Default Workshop Password: <code className="bg-brand-bg text-brand-ink/80 px-1.5 py-0.5 rounded font-mono">0000</code>
              </div>
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

                {/* Price Tag & Description */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-brand-ink/80 mb-1.5">
                      Artisan Story & Details *
                    </label>
                    <textarea
                      placeholder="Describe the materials used, hours of needlework, sizing, care guide, etc..."
                      rows={2}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full bg-brand-bg text-brand-ink text-xs px-3.5 py-2 rounded-none border border-brand-ink/15 focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                </div>

                {/* IMAGE UPLOAD PANEL (strict file pickers, local base64, multiple supported) */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-brand-accent mb-1.5">
                    Direct Image Uploads (Converted to Local Base64) *
                  </label>
                  
                  {/* Drag-drop or click box */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-brand-ink/15 hover:border-brand-accent bg-brand-bg hover:bg-white p-6 rounded-none cursor-pointer text-center transition-all duration-150"
                  >
                    <Upload className="w-8 h-8 text-brand-ink/30 mx-auto mb-2 stroke-1" />
                    <p className="text-xs font-bold text-brand-ink/80 uppercase tracking-wider">Click to upload from your device</p>
                    <p className="text-[10px] text-brand-ink/50 mt-1">
                      Supports multiple photos. Files are compiled and saved securely to LocalStorage.
                    </p>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
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
                        {formImages.map((base64, index) => (
                          <div 
                            key={index} 
                            className="group relative aspect-square rounded-none overflow-hidden border border-brand-ink/10 shadow-xs"
                          >
                            <img
                              src={base64}
                              alt="Upload preview"
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
                    className="bg-brand-accent hover:bg-brand-accent/90 text-white px-6 py-2.5 rounded-none text-xs font-bold uppercase tracking-wider transition-all shadow-xs"
                  >
                    {editingProduct ? 'Update Masterpiece' : 'Save & Publish'}
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

    </div>
  );
}
