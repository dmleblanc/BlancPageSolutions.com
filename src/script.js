let config = null;

async function loadConfig() {
    try {
        const response = await fetch('config.json');
        config = await response.json();
        return config;
    } catch (error) {
        console.error('Error loading config:', error);
        return null;
    }
}

function applyTheme(theme) {
    const root = document.documentElement;
    if (theme && theme.colors) {
        Object.entries(theme.colors).forEach(([key, value]) => {
            const cssVarName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            root.style.setProperty(`--${cssVarName}`, value);
        });
    }
    if (theme && theme.fonts) {
        applyFonts(theme.fonts);
    }
}

function applyFonts(fonts) {
    const root = document.documentElement;
    
    if (fonts.imports && fonts.imports.length > 0) {
        fonts.imports.forEach(url => {
            const link = document.createElement('link');
            link.href = url;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        });
    }
    
    if (fonts.brand) {
        root.style.setProperty('--font-brand', `'${fonts.brand.name}', ${fonts.brand.fallback}`);
    }
    if (fonts.heading) {
        root.style.setProperty('--font-heading', `'${fonts.heading.name}', ${fonts.heading.fallback}`);
        root.style.setProperty('--font-heading-weight', fonts.heading.weight);
    }
    if (fonts.body) {
        root.style.setProperty('--font-body', `'${fonts.body.name}', ${fonts.body.fallback}`);
        root.style.setProperty('--font-body-weight', fonts.body.weight);
    }
    if (fonts.button) {
        root.style.setProperty('--font-button', `'${fonts.button.name}', ${fonts.button.fallback}`);
        root.style.setProperty('--font-button-weight', fonts.button.weight);
    }
}

function handleLogo(siteConfig) {
    const navBrand = document.querySelector('.nav-brand');
    const titleElement = document.querySelector('.nav-brand h1');
    let logoElement = document.querySelector('.nav-brand .logo');
    
    // Always show the title
    if (titleElement) titleElement.style.display = 'block';
    
    if (siteConfig && siteConfig.logo && navBrand) {
        // Create logo element if it doesn't exist
        if (!logoElement) {
            logoElement = document.createElement('img');
            logoElement.className = 'logo';
            navBrand.insertBefore(logoElement, titleElement);
        }
        
        const testImage = new Image();
        testImage.onload = function() {
            logoElement.style.display = 'block';
            logoElement.src = siteConfig.logo;
            logoElement.alt = siteConfig.name || 'Logo';
        };
        testImage.onerror = function() {
            if (logoElement) {
                logoElement.remove();
            }
        };
        testImage.src = siteConfig.logo;
    } else {
        // Remove logo element if it exists
        if (logoElement) {
            logoElement.remove();
        }
    }
}

function populateNavigation(navItems) {
    const navMenu = document.getElementById('nav-menu');
    if (navMenu && navItems) {
        navItems.forEach(item => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = item.href;
            a.textContent = item.label;
            li.appendChild(a);
            navMenu.appendChild(li);
        });
    }
}

function populateHero(heroConfig) {
    if (heroConfig) {
        const heroTitle = document.getElementById('hero-title');
        const heroSubtitle = document.getElementById('hero-subtitle');
        const ctaButton = document.getElementById('cta-button');
        
        if (heroTitle) heroTitle.textContent = heroConfig.title;
        if (heroSubtitle) heroSubtitle.textContent = heroConfig.subtitle;
        if (ctaButton) ctaButton.textContent = heroConfig.ctaText;
    }
}

function populateAbout(aboutConfig) {
    if (aboutConfig) {
        const aboutTitle = document.getElementById('about-title');
        const aboutDescription = document.getElementById('about-description');
        
        if (aboutTitle) aboutTitle.textContent = aboutConfig.title;
        if (aboutDescription) aboutDescription.textContent = aboutConfig.description;
    }
}

function populateServices(services, servicesSection) {
    const servicesGrid = document.getElementById('services-grid');
    const servicesTitle = document.getElementById('services-title');
    
    if (servicesTitle && servicesSection) {
        servicesTitle.textContent = servicesSection.title;
    }
    
    if (servicesGrid && services) {
        services.forEach(service => {
            const serviceCard = document.createElement('div');
            serviceCard.className = 'service-card';
            
            const title = document.createElement('h3');
            title.textContent = service.title;
            
            const description = document.createElement('p');
            description.textContent = service.description;
            
            serviceCard.appendChild(title);
            serviceCard.appendChild(description);
            servicesGrid.appendChild(serviceCard);
        });
    }
}

function populateContactForm(contactConfig) {
    if (contactConfig) {
        const contactTitle = document.getElementById('contact-title');
        const contactForm = document.getElementById('contact-form');
        
        if (contactTitle) contactTitle.textContent = contactConfig.title;
        
        if (contactForm && contactConfig.formFields) {
            contactConfig.formFields.forEach(field => {
                if (field.type === 'textarea') {
                    const textarea = document.createElement('textarea');
                    textarea.name = field.name;
                    textarea.placeholder = field.placeholder;
                    textarea.rows = field.rows;
                    textarea.required = field.required;
                    contactForm.appendChild(textarea);
                } else {
                    const input = document.createElement('input');
                    input.type = field.type;
                    input.name = field.name;
                    input.placeholder = field.placeholder;
                    input.required = field.required;
                    contactForm.appendChild(input);
                }
            });
            
            const submitButton = document.createElement('button');
            submitButton.type = 'submit';
            submitButton.textContent = contactConfig.submitText;
            contactForm.appendChild(submitButton);
        }
    }
}

function populateFooter(footerConfig) {
    if (footerConfig) {
        const footerText = document.getElementById('footer-text');
        if (footerText) footerText.textContent = footerConfig.copyrightText;
    }
}

async function populateGitHub(githubConfig) {
    if (!githubConfig) return;
    
    const githubTitle = document.getElementById('github-title');
    if (githubTitle) githubTitle.textContent = githubConfig.title;
    
    if (githubConfig.showRecentCommits) {
        await loadRecentCommits(githubConfig);
        startCommitsAutoRefresh(githubConfig); // Start real-time updates
    }
    
    if (githubConfig.showContributions) {
        await loadContributions(githubConfig);
    }
}

async function loadRecentCommits(githubConfig) {
    const commitsList = document.getElementById('commits-list');
    if (!commitsList) return;
    
    try {
        // Use the new commits endpoint for real-time data
        const apiUrl = `${githubConfig.apiEndpoint}?username=${githubConfig.username}&endpoint=commits`;
        const response = await fetch(apiUrl);
        const events = await response.json();
        
        const commitEvents = events.slice(0, githubConfig.maxCommits || 10);
        
        if (commitEvents.length === 0) {
            commitsList.innerHTML = '<div class="no-commits">No recent commits found</div>';
            return;
        }
        
        const commitsHtml = commitEvents.map(event => {
            const commits = event.payload.commits || [];
            const latestCommit = commits[0]; // First commit in the event
            const date = new Date(event.created_at).toLocaleDateString();
            const time = new Date(event.created_at).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            return `
                <div class="commit-item">
                    <div class="commit-header">
                        <a href="https://github.com/${event.repo.name}" target="_blank" class="repo-name">
                            ${event.repo.name}
                        </a>
                        <span class="commit-date">${date} ${time}</span>
                    </div>
                    <div class="commit-message">${latestCommit?.message || 'No message'}</div>
                    <div class="commit-sha">
                        <a href="${latestCommit?.url || '#'}" target="_blank">
                            ${latestCommit?.sha?.substring(0, 7) || 'No SHA'}
                        </a>
                    </div>
                </div>
            `;
        }).join('');
        
        commitsList.innerHTML = commitsHtml;
    } catch (error) {
        console.error('Error loading GitHub commits:', error);
        commitsList.innerHTML = '<div class="error">Failed to load recent commits</div>';
    }
}

// Auto-refresh commits every 30 minutes for real-time updates
let commitsRefreshInterval;

function startCommitsAutoRefresh(githubConfig) {
    // Clear any existing interval
    if (commitsRefreshInterval) {
        clearInterval(commitsRefreshInterval);
    }
    
    // Set up auto-refresh every 30 minutes
    if (githubConfig && githubConfig.showRecentCommits) {
        commitsRefreshInterval = setInterval(() => {
            loadRecentCommits(githubConfig);
        }, 1800000); // 30 minutes
    }
}

async function loadContributions(githubConfig) {
    const contributionsCalendar = document.getElementById('contributions-calendar');
    if (!contributionsCalendar) return;
    
    try {
        const apiUrl = `${githubConfig.apiEndpoint}?username=${githubConfig.username}&endpoint=contributions`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.data && data.data.user && data.data.user.contributionsCollection) {
            renderContributionCalendar(data.data.user.contributionsCollection.contributionCalendar, contributionsCalendar);
        } else {
            throw new Error('Invalid contributions data format');
        }
    } catch (error) {
        console.error('Error loading GitHub contributions:', error);
        contributionsCalendar.innerHTML = `
            <div class="contributions-placeholder">
                <p>Contribution calendar temporarily unavailable</p>
                <a href="https://github.com/${githubConfig.username}" target="_blank" class="github-link">
                    View full profile on GitHub →
                </a>
            </div>
        `;
    }
}

function renderContributionCalendar(calendarData, container) {
    if (!calendarData || !calendarData.weeks) {
        container.innerHTML = '<div class="error">Invalid calendar data</div>';
        return;
    }

    const { weeks, totalContributions } = calendarData;
    
    let calendarHtml = `
        <div class="contributions-header">
            <h4>Contributions in the last year</h4>
            <span class="total-contributions">${totalContributions} contributions</span>
        </div>
        <div class="contributions-grid">
            <div class="days-of-week">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
            </div>
            <div class="calendar-weeks">
    `;

    weeks.forEach(week => {
        calendarHtml += '<div class="week">';
        week.contributionDays.forEach(day => {
            const level = getContributionLevel(day.contributionCount);
            const date = new Date(day.date).toLocaleDateString();
            calendarHtml += `
                <div class="day contribution-${level}" 
                     title="${day.contributionCount} contributions on ${date}"
                     data-count="${day.contributionCount}"
                     data-date="${day.date}">
                </div>
            `;
        });
        calendarHtml += '</div>';
    });

    calendarHtml += `
            </div>
        </div>
        <div class="contributions-legend">
            <span>Less</span>
            <div class="legend-colors">
                <div class="day contribution-0"></div>
                <div class="day contribution-1"></div>
                <div class="day contribution-2"></div>
                <div class="day contribution-3"></div>
                <div class="day contribution-4"></div>
            </div>
            <span>More</span>
        </div>
    `;

    container.innerHTML = calendarHtml;
}

function getContributionLevel(count) {
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    if (count <= 10) return 3;
    return 4;
}

function populateProfile(profileConfig) {
    if (profileConfig) {
        const profileTitle = document.getElementById('profile-title');
        const profileHeadshot = document.getElementById('profile-headshot');
        const profileName = document.getElementById('profile-name');
        const profileRole = document.getElementById('profile-role');
        const profileBio = document.getElementById('profile-bio');
        const profileLinkedin = document.getElementById('profile-linkedin');
        const profileEmail = document.getElementById('profile-email');
        
        if (profileTitle) profileTitle.textContent = profileConfig.title;
        if (profileHeadshot) {
            profileHeadshot.src = profileConfig.headshot;
            profileHeadshot.alt = `${profileConfig.name} - ${profileConfig.role}`;
        }
        if (profileName) profileName.textContent = profileConfig.name;
        if (profileRole) profileRole.textContent = profileConfig.role;
        if (profileBio) profileBio.textContent = profileConfig.bio;
        if (profileLinkedin && profileConfig.linkedin) {
            profileLinkedin.href = profileConfig.linkedin;
        }
        if (profileEmail && profileConfig.email) {
            profileEmail.href = `mailto:${profileConfig.email}`;
        }
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    const configData = await loadConfig();
    
    if (configData) {
        applyTheme(configData.theme);
        handleLogo(configData.site);
        populateNavigation(configData.navigation);
        populateHero(configData.hero);
        populateAbout(configData.about);
        populateProfile(configData.profile);
        populateServices(configData.services, configData.servicesSection);
        populateGitHub(configData.github);
        populateContactForm(configData.contact);
        populateFooter(configData.footer);
    }
    
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const ctaButton = document.querySelector('.cta-button');
    const contactForm = document.querySelector('.contact-form');

    if (hamburger) {
        hamburger.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            
            const spans = hamburger.querySelectorAll('span');
            if (navMenu.classList.contains('active')) {
                spans[0].style.transform = 'rotate(-45deg) translate(-5px, 6px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(45deg) translate(-5px, -6px)';
            } else {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });
    }

    setTimeout(() => {
        const navLinks = document.querySelectorAll('.nav-menu a');
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                if (window.innerWidth <= 768) {
                    navMenu.classList.remove('active');
                    const spans = hamburger.querySelectorAll('span');
                    spans[0].style.transform = 'none';
                    spans[1].style.opacity = '1';
                    spans[2].style.transform = 'none';
                }
                
                const targetId = this.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                
                if (targetSection) {
                    const offsetTop = targetSection.offsetTop - 70;
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }, 100);

    if (ctaButton) {
        ctaButton.addEventListener('click', function() {
            const contactSection = document.querySelector('#contact');
            if (contactSection) {
                const offsetTop = contactSection.offsetTop - 70;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    }

    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(contactForm);
            const data = {};
            formData.forEach((value, key) => {
                data[key] = value;
            });
            
            console.log('Form submission:', data);
            
            const successMessage = configData?.contact?.successMessage || 'Thank you for your message!';
            alert(successMessage);
            
            contactForm.reset();
        });
    }

    let lastScroll = 0;
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > lastScroll && currentScroll > 100) {
            navbar.style.transform = 'translateY(-100%)';
        } else {
            navbar.style.transform = 'translateY(0)';
        }
        
        lastScroll = currentScroll <= 0 ? 0 : currentScroll;
    });

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    setTimeout(() => {
        const animatedElements = document.querySelectorAll('.service-card');
        animatedElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.5s, transform 0.5s';
            observer.observe(el);
        });
    }, 100);
});