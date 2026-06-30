/* ================================================================
   DEVOPS PORTFOLIO - INTERACTIVE JAVASCRIPT
   Author: Bodaballa Tarun Kumar
   Description: Handles interactivity, form submission, and mobile menu
   ================================================================ */

// ================================================================
// 1. DOCUMENT READY & INITIALIZATION
// Wait for DOM to be fully loaded before executing scripts
// ================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('DevOps Portfolio loaded successfully');
    
    // Initialize all event listeners
    initializeMenuToggle();
    initializeFormSubmission();
    initializeScrollBehavior();
});

// ================================================================
// 2. MOBILE MENU TOGGLE FUNCTIONALITY
// Handles hamburger menu click and navigation link clicks
// ================================================================

function initializeMenuToggle() {
    // Get hamburger menu and navigation menu elements
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    // Check if elements exist before adding listeners
    if (!hamburger || !navMenu) {
        console.warn('Hamburger or nav menu element not found');
        return;
    }
    
    // Toggle menu visibility when hamburger is clicked
    hamburger.addEventListener('click', function() {
        navMenu.classList.toggle('active');
        console.log('Menu toggled');
    });
    
    // Close menu when a navigation link is clicked
    const navLinks = navMenu.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            navMenu.classList.remove('active');
            console.log('Navigation link clicked, menu closed');
        });
    });
}

// ================================================================
// 3. FORM SUBMISSION HANDLER
// Process contact form data and provide user feedback
// ================================================================

function initializeFormSubmission() {
    // Get contact form element
    const contactForm = document.getElementById('contactForm');
    
    // Return if form doesn't exist
    if (!contactForm) {
        console.warn('Contact form not found');
        return;
    }
    
    // Add submit event listener to form
    contactForm.addEventListener('submit', function(event) {
        // Prevent default form submission behavior
        event.preventDefault();
        
        // Collect form data
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const message = document.getElementById('message').value.trim();
        
        // Validate form inputs
        if (!name || !email || !message) {
            alert('Please fill in all fields');
            return;
        }
        
        // Validate email format
        if (!isValidEmail(email)) {
            alert('Please enter a valid email address');
            return;
        }
        
        // Create form data object
        const formData = {
            name: name,
            email: email,
            message: message,
            timestamp: new Date().toLocaleString()
        };
        
        // Log form data (in production, this would be sent to a server)
        console.log('Form submitted with data:', formData);
        
        // Show success message
        alert(`Thank you for your message, ${name}! I'll get back to you soon.`);
        
        // Reset form fields
        contactForm.reset();
        
        // Store in localStorage for demo purposes
        saveFormData(formData);
    });
}

// ================================================================
// 4. EMAIL VALIDATION FUNCTION
// Validates email format using regex pattern
// ================================================================

function isValidEmail(email) {
    // Regular expression for basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ================================================================
// 5. SAVE FORM DATA TO LOCAL STORAGE
// Stores submitted form data in browser's local storage
// ================================================================

function saveFormData(formData) {
    // Get existing submissions or create empty array
    let submissions = JSON.parse(localStorage.getItem('portfolioSubmissions')) || [];
    
    // Add new submission
    submissions.push(formData);
    
    // Store back in localStorage (limit to last 10 submissions)
    if (submissions.length > 10) {
        submissions = submissions.slice(-10);
    }
    
    localStorage.setItem('portfolioSubmissions', JSON.stringify(submissions));
    console.log('Form data saved to localStorage');
}

// ================================================================
// 6. SCROLL BEHAVIOR & ACTIVE LINK HIGHLIGHTING
// Highlights nav links based on current scroll position
// ================================================================

function initializeScrollBehavior() {
    // Get all navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Add scroll event listener
    window.addEventListener('scroll', function() {
        // Get current scroll position with offset for fixed header
        const currentScrollPos = window.scrollY + 100;
        
        // Check each navigation link
        navLinks.forEach(link => {
            // Get target section ID from href
            const href = link.getAttribute('href');
            
            // Skip if not a hash link
            if (!href || href === '#') return;
            
            // Find corresponding section
            const section = document.querySelector(href);
            
            // Skip if section doesn't exist
            if (!section) return;
            
            // Get section position and height
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            
            // Check if user has scrolled to this section
            if (currentScrollPos >= sectionTop && currentScrollPos < sectionTop + sectionHeight) {
                // Remove active class from all links
                navLinks.forEach(l => l.classList.remove('active'));
                
                // Add active class to current link
                link.classList.add('active');
            }
        });
    });
}

// ================================================================
// 7. UTILITY FUNCTION - GET DEVICE TYPE
// Detects device type for responsive behavior
// ================================================================

function getDeviceType() {
    // Check viewport width to determine device type
    const width = window.innerWidth;
    
    if (width < 480) {
        return 'mobile';
    } else if (width < 768) {
        return 'tablet';
    } else {
        return 'desktop';
    }
}

// ================================================================
// 8. UTILITY FUNCTION - LOG ANALYTICS
// Tracks user interactions for analytics purposes
// ================================================================

function logAnalytics(eventName, eventData = {}) {
    // Create analytics event object
    const analyticsEvent = {
        eventName: eventName,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        device: getDeviceType(),
        ...eventData
    };
    
    // Log to console (in production, send to analytics service)
    console.log('Analytics Event:', analyticsEvent);
}

// ================================================================
// 9. INTERSECTION OBSERVER FOR LAZY LOADING
// Triggers animations when elements enter viewport
// ================================================================

function initializeLazyLoading() {
    // Create intersection observer configuration
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    // Create observer callback
    const observerCallback = (entries) => {
        entries.forEach(entry => {
            // If element is in viewport
            if (entry.isIntersecting) {
                // Add visible class to trigger animation
                entry.target.classList.add('visible');
                
                // Stop observing this element
                observer.unobserve(entry.target);
                
                console.log('Element loaded:', entry.target);
            }
        });
    };
    
    // Create observer instance
    const observer = new IntersectionObserver(observerCallback, observerOptions);
    
    // Observe all project cards
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach(card => observer.observe(card));
}

// Initialize lazy loading when DOM is ready
document.addEventListener('DOMContentLoaded', initializeLazyLoading);

// ================================================================
// 10. EVENT TRACKING - TRACK LINK CLICKS
// Monitors when users click on external links or projects
// ================================================================

function trackLinkClicks() {
    // Get all project links
    const projectLinks = document.querySelectorAll('.project-link');
    const socialLinks = document.querySelectorAll('.social-links a');
    const allLinks = [...projectLinks, ...socialLinks];
    
    // Add click listener to each link
    allLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            // Log click event
            logAnalytics('link_click', {
                linkText: this.textContent,
                linkUrl: this.href
            });
            
            console.log('Link clicked:', this.href);
        });
    });
}

// Initialize link tracking when DOM is ready
document.addEventListener('DOMContentLoaded', trackLinkClicks);

// ================================================================
// 11. WINDOW RESIZE HANDLER
// Responds to window resize events for responsive adjustments
// ================================================================

let resizeTimer;

window.addEventListener('resize', function() {
    // Clear previous timer
    clearTimeout(resizeTimer);
    
    // Set new timer to avoid excessive function calls
    resizeTimer = setTimeout(function() {
        // Log device type on resize
        console.log('Window resized. Device type:', getDeviceType());
        
        // Close mobile menu on resize to desktop
        const navMenu = document.querySelector('.nav-menu');
        if (getDeviceType() === 'desktop' && navMenu) {
            navMenu.classList.remove('active');
        }
        
        // Log analytics
        logAnalytics('window_resize', {
            width: window.innerWidth,
            height: window.innerHeight
        });
    }, 250);
});

// ================================================================
// 12. PAGE LOAD ANALYTICS
// Logs page load event and performance data
// ================================================================

window.addEventListener('load', function() {
    // Get page load time
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    
    // Log page load analytics
    logAnalytics('page_load', {
        loadTime: pageLoadTime + 'ms',
        url: window.location.href
    });
    
    console.log('Page fully loaded in ' + pageLoadTime + 'ms');
});

// ================================================================
// 13. KEYBOARD SHORTCUTS
// Implements keyboard shortcuts for power users
// ================================================================

document.addEventListener('keydown', function(event) {
    // Check for keyboard shortcuts
    
    // Ctrl/Cmd + / to show help
    if ((event.ctrlKey || event.metaKey) && event.key === '/') {
        event.preventDefault();
        showKeyboardShortcuts();
    }
    
    // Escape to close mobile menu
    if (event.key === 'Escape') {
        const navMenu = document.querySelector('.nav-menu');
        if (navMenu) {
            navMenu.classList.remove('active');
        }
    }
});

// ================================================================
// 14. SHOW KEYBOARD SHORTCUTS FUNCTION
// Displays available keyboard shortcuts to user
// ================================================================

function showKeyboardShortcuts() {
    const shortcuts = `
Keyboard Shortcuts:
==================
Ctrl/Cmd + / : Show this help
Esc : Close mobile menu
Home : Go to top
End : Go to bottom

Navigation:
- Home: #home
- About: #about
- Skills: #skills
- Projects: #projects
- Contact: #contact
    `;
    
    console.log(shortcuts);
    alert('Press Ctrl/Cmd + / for keyboard shortcuts');
}

// ================================================================
// 15. ACCESSIBILITY ENHANCEMENTS
// Improve keyboard navigation and screen reader support
// ================================================================

function initializeAccessibility() {
    // Add role and aria attributes where needed
    const mainSections = document.querySelectorAll('section');
    mainSections.forEach((section, index) => {
        if (!section.id) {
            section.id = `section-${index}`;
        }
    });
    
    console.log('Accessibility features initialized');
}

// Initialize accessibility on page load
document.addEventListener('DOMContentLoaded', initializeAccessibility);

// ================================================================
// 16. DEBUGGING & CONSOLE HELPERS
// Useful functions for development and debugging
// ================================================================

// Function to get form submission history
window.getFormHistory = function() {
    const submissions = JSON.parse(localStorage.getItem('portfolioSubmissions')) || [];
    console.table(submissions);
    return submissions;
};

// Function to clear form history
window.clearFormHistory = function() {
    localStorage.removeItem('portfolioSubmissions');
    console.log('Form history cleared');
};

// Function to test all analytics
window.testAnalytics = function() {
    logAnalytics('test_event', { test: true });
    console.log('Analytics test sent');
};

// Log initialization complete
console.log('All JavaScript modules loaded and initialized');
