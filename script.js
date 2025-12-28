// script.js — handles AOS init, mobile menu, smooth scrolling and optional redirects

// Keep functions global so inline onclick attributes still work (hamburg/cancel)
function hamburg(){
    const navbar = document.querySelector(".dropdown");
    if(navbar) navbar.style.transform = "translateY(0px)";
}
function cancel(){
    const navbar = document.querySelector(".dropdown");
    if(navbar) navbar.style.transform = "translateY(-500px)";
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize AOS if available
    if (window.AOS && typeof AOS.init === 'function') {
        AOS.init({ offset: 0 });
    }

    // Scroll to top button functionality
    const scrollToTopButton = document.getElementById('scroll-to-top');
    
    // Show button when page is scrolled 200px or more
    const toggleScrollButton = () => {
        if (window.scrollY > 200) {
            scrollToTopButton.classList.add('visible');
        } else {
            scrollToTopButton.classList.remove('visible');
        }
    };

    // Smooth scroll to top when button is clicked
    scrollToTopButton.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Listen for scroll events
    window.addEventListener('scroll', toggleScrollButton);

    // Smooth-scroll / redirect handler for nav and dropdown links
    const selector = 'nav .links a[href^="#"], .dropdown .links a[href^="#"], nav .links a[data-redirect], .dropdown .links a[data-redirect]';
    const links = document.querySelectorAll(selector);
    const dropdown = document.querySelector('.dropdown');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            const redirect = link.dataset.redirect; // optional: data-redirect="/otherpage.html"

            // If a data-redirect attribute is present, navigate to that page
            if (redirect) {
                // navigate away
                window.location.href = redirect;
                return;
            }

            // If href is an in-page anchor, smooth scroll to it
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    // update URL hash without causing an extra jump
                    history.replaceState(null, '', href);
                }

                // close mobile dropdown menu if open
                if (dropdown) {
                    dropdown.style.transform = 'translateY(-500px)';
                }
            }
        });
    });

    // Close dropdown when clicking outside the nav on mobile
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-container') && dropdown) {
            dropdown.style.transform = 'translateY(-500px)';
        }
    });

    // Download-CV fallback: force download of resume.pdf (works even if browser opens PDFs inline)
    const downloadLink = document.querySelector('.download-cv');
    if (downloadLink) {
        downloadLink.addEventListener('click', async (e) => {
            // Prevent default anchor behavior so we can control download
            e.preventDefault();
            const url = downloadLink.getAttribute('href') || 'resume.pdf';
            try {
                const resp = await fetch(url, { method: 'GET' });
                if (!resp.ok) {
                    alert('Resume file not found. Please place "resume.pdf" in the project folder.');
                    return;
                }
                const blob = await resp.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                // Use the suggested filename if provided, otherwise default
                a.download = downloadLink.getAttribute('download') || 'resume.pdf';
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(blobUrl);
            } catch (err) {
                console.error('Download failed', err);
                alert('Could not download the resume. Try right-click -> Save link as... or check that resume.pdf exists.');
            }
        });
    }

    // Skills animation for both horizontal bars and circles
    (function initSkills(){
        const sections = [document.getElementById('skills'), document.getElementById('soft-skills')].filter(Boolean);
        if (!sections.length) return;

        // prepare all items in both sections
        sections.forEach(section => {
            const items = Array.from(section.querySelectorAll('.skill-item'));
            items.forEach(item => {
                // Reset percentage text
                const num = item.querySelector('.skill-num');
                if (num) num.textContent = '0%';

                // Setup based on type (horizontal or circular)
                if (item.classList.contains('horizontal')) {
                    const prog = item.querySelector('.skill-progress');
                    if (prog) prog.style.width = '0%';
                } else {
                    const prog = item.querySelector('.skill-progress');
                    if (!prog) return;
                    const r = Number(prog.getAttribute('r')) || 52;
                    const circumference = 2 * Math.PI * r;
                    prog.style.strokeDasharray = circumference.toString();
                    prog.style.strokeDashoffset = circumference.toString();
                    prog.dataset.circ = String(circumference);
                }
            });

            // Animate when section becomes visible
            const io = new IntersectionObserver((entries, obs) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        items.forEach(it => {
                            const pct = Math.max(0, Math.min(100, parseInt(it.dataset.pct || '0', 10)));
                            const prog = it.querySelector('.skill-progress');
                            const num = it.querySelector('.skill-num');
                            const duration = 1000;
                            const start = performance.now();

                            const tick = (now) => {
                                const elapsed = now - start;
                                const t = Math.min(1, elapsed / duration);
                                const eased = 1 - Math.pow(1 - t, 3);

                                // Update progress based on type
                                if (it.classList.contains('horizontal')) {
                                    if (prog) prog.style.width = (pct * eased) + '%';
                                } else {
                                    const circ = Number(prog.dataset.circ || 0);
                                    const targetOffset = circ * (1 - pct / 100);
                                    const currentOffset = circ - (circ - targetOffset) * eased;
                                    prog.style.strokeDashoffset = String(currentOffset);
                                }

                                // Update number
                                if (num) num.textContent = Math.round(pct * eased) + '%';

                                if (t < 1) {
                                    requestAnimationFrame(tick);
                                } else {
                                    // Set final values
                                    if (it.classList.contains('horizontal')) {
                                        if (prog) prog.style.width = pct + '%';
                                    } else {
                                        const circ = Number(prog.dataset.circ || 0);
                                        prog.style.strokeDashoffset = String(circ * (1 - pct / 100));
                                    }
                                    if (num) num.textContent = pct + '%';
                                }
                            };
                            requestAnimationFrame(tick);
                        });
                        obs.disconnect();
                    }
                });
            }, { threshold: 0.25 });

            io.observe(section);
        });
    })();

    // Contact form handling with Web3Forms integration
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        const feedback = document.getElementById('contact-feedback');
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#6fdcff';
        const submitBtn = contactForm.querySelector('.btn-submit');
        
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Basic validation
            const name = (contactForm.name.value || '').trim();
            const email = (contactForm.email.value || '').trim();
            const message = (contactForm.message.value || '').trim();

            if (!name || !email || !message) {
                feedback.textContent = 'Please fill in all fields.';
                feedback.style.color = 'tomato';
                return;
            }

            const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRe.test(email)) {
                feedback.textContent = 'Please enter a valid email address.';
                feedback.style.color = 'tomato';
                return;
            }

            // Disable form while submitting
            submitBtn.disabled = true;
            feedback.style.color = accent.trim();
            feedback.textContent = 'Sending...';

            try {
                const formData = new FormData(contactForm);
                const response = await fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                
                if (data.success) {
                    feedback.style.color = accent.trim();
                    feedback.textContent = 'Message sent — thank you!';
                    contactForm.reset();
                } else {
                    throw new Error('Form submission failed');
                }
            } catch (err) {
                console.error('Form submission error:', err);
                feedback.style.color = 'tomato';
                feedback.textContent = 'Could not send message. Please try again.';
            } finally {
                submitBtn.disabled = false;
                setTimeout(() => {
                    if (feedback.style.color === accent.trim()) {
                        feedback.textContent = '';
                    }
                }, 5000);
            }
        });
    }
});
