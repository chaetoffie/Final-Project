document.addEventListener('DOMContentLoaded', () => {
  /* Animations on scroll */
  const animatedElements = document.querySelectorAll('.animate-on-scroll');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('is-visible');
    });
  }, { threshold: 0.1 });
  animatedElements.forEach((el, i) => {
    el.style.setProperty('--animation-order', i % 4);
    observer.observe(el);
  });

  /* Smooth scroll for anchors */
  document.querySelectorAll('nav a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      e.preventDefault();
      const el = document.querySelector(anchor.getAttribute('href'));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* Sticky Nav */
  const nav = document.querySelector('nav');
  const setNavStyle = () => {
    nav.classList.toggle('scrolled', window.scrollY > 8);
  };
  setNavStyle();
  window.addEventListener('scroll', setNavStyle, { passive: true });

  /* Menu Filters */
  const filterButtons = document.querySelectorAll('.filter-btn');
const menuItems = document.querySelectorAll('#menu .menu-item');
 
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      const filter = btn.dataset.filter;
      menuItems.forEach(item => {
        if (filter === 'all' || item.dataset.category === filter) {
          item.classList.remove('filter-hidden');
        } else {
          item.classList.add('filter-hidden');
        }
      });
    });
  });

  /* Cart State */
  const cart = [];
  const cartToggle = document.getElementById('cart-toggle');
  const cartDropdown = document.querySelector('.cart-dropdown');
  const cartList = cartDropdown.querySelector('.cart-list');
  const cartTotal = cartDropdown.querySelector('.cart-total');
  const cartEmpty = cartDropdown.querySelector('.cart-empty');
  const cartCount = document.querySelector('.cart-count');

  const formatMoney = num => '$' + (Number(num) || 0).toFixed(2);
  const recalcBadge = () => cartCount.textContent = cart.reduce((s, i) => s + i.qty, 0);

  const updateCart = () => {
    cartList.innerHTML = '';
    if (!cart.length) {
      cartEmpty.style.display = 'block';
    } else {
      cartEmpty.style.display = 'none';
      cart.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'cart-item';
        li.innerHTML = `
          <img src="${item.img}" alt="${item.name}" class="cart-thumb" />
          <span class="cart-item-name" title="View details">${item.name}</span>
          <div class="cart-item-controls">
            <button class="decrease" aria-label="Decrease quantity">-</button>
            <span class="cart-item-qty">${item.qty}</span>
            <button class="increase" aria-label="Increase quantity">+</button>
          </div>
          <span class="cart-item-price">${formatMoney(item.price * item.qty)}</span>
        `;

        li.addEventListener('click', e => e.stopPropagation());

        li.querySelector('.cart-item-name').addEventListener('click', e => {
          e.stopPropagation();
          showToast(`Order Details: ${item.name} - Qty: ${item.qty}`);
        });

        li.querySelector('.increase').addEventListener('click', e => {
          e.stopPropagation();
          item.qty++;
          updateCart();
        });

        li.querySelector('.decrease').addEventListener('click', e => {
          e.stopPropagation();
          if (item.qty > 1) item.qty--;
          else cart.splice(index, 1);
          updateCart();
        });

        cartList.appendChild(li);
      });
    }
    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    cartTotal.textContent = `Total: ${formatMoney(total)}`;
    recalcBadge();
  };

  /* Cart Toggle & Close */
  const closeCart = () => {
    cartDropdown.classList.remove('open');
    cartToggle.setAttribute('aria-expanded', 'false');
  };
  const openCart = () => {
    cartDropdown.classList.add('open');
    cartToggle.setAttribute('aria-expanded', 'true');
  };

  cartToggle.addEventListener('click', e => {
    e.stopPropagation();
    cartDropdown.classList.toggle('open');
    cartToggle.setAttribute('aria-expanded', cartDropdown.classList.contains('open'));
  });

  document.addEventListener('click', e => {
    const inside = cartDropdown.contains(e.target) || cartToggle.contains(e.target);
    if (!inside) closeCart();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeCart();
  });

  /* Cart Actions */
  cartDropdown.querySelector('.cart-clear').addEventListener('click', e => {
    e.stopPropagation();
    cart.length = 0;
    updateCart();
  });
  cartDropdown.querySelector('.cart-checkout').addEventListener('click', e => {
  e.stopPropagation();
  if (!cart.length) return showToast('Your cart is empty.');

  // Save current cart to localStorage for demo checkout page
  localStorage.setItem('demoCart', JSON.stringify(cart));

  // Redirect to demo checkout page
  window.location.href = 'checkout.html';
});


  /* Toast Notifications */
  const showToast = msg => {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 2000);
  };

  /* Add To Cart Buttons */
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const itemEl = e.target.closest('.menu-item');
      const name = itemEl.querySelector('h3').textContent.trim();
      const priceEl = itemEl.querySelector('.price');
      const price = priceEl?.dataset?.price ?
        parseFloat(priceEl.dataset.price) :
        parseFloat((priceEl.textContent || '').replace(/[^\d.]/g, '')) || 0;
      const img = itemEl.querySelector('img')?.getAttribute('src');

      const existing = cart.find(i => i.name === name);
      existing ? existing.qty++ : cart.push({ name, price, img, qty: 1 });

      updateCart();
      showToast(`${name} added to cart ✔`);
      openCart();
    });
  });

  // *** The custom contact form submission handler has been removed to allow native browser submission. ***

  recalcBadge();

  /* Lenis Smooth Scroll - Added here instead of separate DOMContentLoaded */
  const lenis = new Lenis({
    lerp: 0.070,
    smoothWheel: true,
  });
  
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
});