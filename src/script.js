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

let activeServiceIndex = null;

function populateServices(services, servicesSection) {
    const servicesList = document.getElementById('services-list');
    const servicesTitle = document.getElementById('services-title');
    
    if (servicesTitle && servicesSection) {
        servicesTitle.textContent = servicesSection.title;
    }
    
    if (servicesList && services) {
        services.forEach((service, index) => {
            const serviceCard = document.createElement('div');
            serviceCard.className = 'service-card';
            
            // Create main service icon
            if (service.icon) {
                const iconContainer = document.createElement('div');
                iconContainer.className = 'service-icon';
                
                if (service.iconType === 'fontawesome') {
                    const icon = document.createElement('i');
                    icon.className = `fas fa-${service.icon}`;
                    iconContainer.appendChild(icon);
                } else {
                    // Handle other icon types (SVG files, etc.) in the future
                    const icon = document.createElement('i');
                    icon.className = `fas fa-${service.icon}`;
                    iconContainer.appendChild(icon);
                }
                
                serviceCard.appendChild(iconContainer);
            }
            
            const title = document.createElement('h3');
            title.textContent = service.title;
            
            const description = document.createElement('p');
            description.textContent = service.description;
            
            // Add title and description to card
            serviceCard.appendChild(title);
            serviceCard.appendChild(description);
            
            // Create tool badges if tools are specified
            if (service.tools && service.tools.length > 0) {
                const toolBadges = document.createElement('div');
                toolBadges.className = 'tool-badges';
                
                service.tools.forEach(tool => {
                    const toolBadge = document.createElement('div');
                    toolBadge.className = 'tool-badge';
                    toolBadge.title = tool.charAt(0).toUpperCase() + tool.slice(1); // Tooltip
                    
                    const toolIcon = document.createElement('img');
                    toolIcon.src = `assets/icons/tools/${tool}.svg`;
                    toolIcon.alt = tool;
                    toolIcon.onerror = function() {
                        // Fallback if SVG doesn't exist
                        this.style.display = 'none';
                        const fallbackText = document.createElement('span');
                        fallbackText.textContent = tool.charAt(0).toUpperCase();
                        fallbackText.className = 'tool-fallback';
                        this.parentNode.appendChild(fallbackText);
                    };
                    
                    toolBadge.appendChild(toolIcon);
                    toolBadges.appendChild(toolBadge);
                });
                
                serviceCard.appendChild(toolBadges);
            }
            
            // Add click handler for selection
            serviceCard.addEventListener('click', () => {
                handleServiceSelection(index, services);
            });
            
            // Add keyboard navigation
            serviceCard.tabIndex = 0;
            serviceCard.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleServiceSelection(index, services);
                }
            });
            
            servicesList.appendChild(serviceCard);
        });
        
        // Auto-select first competency (Business Intelligence) by default
        if (services && services.length > 0) {
            setTimeout(() => {
                handleServiceSelection(0, services);
            }, 100);
        }
    }
}

function handleServiceSelection(index, services) {
    const serviceCards = document.querySelectorAll('.service-card');
    const projectsPanel = document.getElementById('projects-panel');
    const isMobile = window.innerWidth <= 768;
    
    // Toggle selection
    if (activeServiceIndex === index) {
        // Deselect current
        serviceCards[index].classList.remove('active');
        // Remove arrow indicator
        const arrow = serviceCards[index].querySelector('.arrow-indicator');
        if (arrow) arrow.remove();
        activeServiceIndex = null;
        
        if (isMobile) {
            // Hide mobile panel
            const mobilePanel = serviceCards[index].nextElementSibling;
            if (mobilePanel && mobilePanel.classList.contains('projects-panel')) {
                mobilePanel.remove();
            }
        } else {
            // Show default message
            showNoSelectionMessage();
        }
    } else {
        // Remove previous active state
        if (activeServiceIndex !== null) {
            serviceCards[activeServiceIndex].classList.remove('active');
            // Remove arrow indicator from previous active card
            const prevArrow = serviceCards[activeServiceIndex].querySelector('.arrow-indicator');
            if (prevArrow) prevArrow.remove();
            
            if (isMobile) {
                const prevMobilePanel = serviceCards[activeServiceIndex].nextElementSibling;
                if (prevMobilePanel && prevMobilePanel.classList.contains('projects-panel')) {
                    prevMobilePanel.remove();
                }
            }
        }
        
        // Set new active
        serviceCards[index].classList.add('active');
        
        // Add arrow indicator for desktop only
        if (!isMobile) {
            const arrowIndicator = document.createElement('div');
            arrowIndicator.className = 'arrow-indicator';
            serviceCards[index].appendChild(arrowIndicator);
        }
        
        activeServiceIndex = index;
        
        if (isMobile) {
            // Insert projects panel after the service card on mobile
            const mobilePanelHtml = createMobileProjectsPanel(services[index]);
            serviceCards[index].insertAdjacentHTML('afterend', mobilePanelHtml);
        } else {
            // Update desktop panel
            renderProjectsPanel(services[index]);
        }
    }
}

function showNoSelectionMessage() {
    const panelContent = document.querySelector('.projects-panel-content');
    if (panelContent) {
        panelContent.innerHTML = `
            <div class="no-selection">
                <p>Select a competency to view related projects</p>
            </div>
        `;
    }
}

function renderProjectsPanel(service) {
    const panelContent = document.querySelector('.projects-panel-content');
    if (!panelContent || !service.projects) return;
    
    panelContent.innerHTML = '';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'projects-panel-header';
    
    const title = document.createElement('h3');
    title.className = 'projects-panel-title';
    title.textContent = service.title;
    header.appendChild(title);
    
    const subtitle = document.createElement('p');
    subtitle.className = 'projects-panel-subtitle';
    subtitle.textContent = `${service.projects.length} Featured Project${service.projects.length !== 1 ? 's' : ''}`;
    header.appendChild(subtitle);
    
    panelContent.appendChild(header);
    
    // Create projects container
    const projectsContainer = document.createElement('div');
    projectsContainer.className = 'projects-container';
    
    // Add project cards
    service.projects.forEach(project => {
        const projectCard = createProjectCard(project);
        projectsContainer.appendChild(projectCard);
    });
    
    panelContent.appendChild(projectsContainer);
}

function createMobileProjectsPanel(service) {
    if (!service.projects || service.projects.length === 0) return '';
    
    let projectsHtml = `
        <div class="projects-panel mobile-visible">
            <div class="projects-panel-content">
                <div class="projects-panel-header">
                    <h3 class="projects-panel-title">${service.title}</h3>
                    <p class="projects-panel-subtitle">${service.projects.length} Featured Project${service.projects.length !== 1 ? 's' : ''}</p>
                </div>
                <div class="projects-container">
    `;
    
    service.projects.forEach(project => {
        const projectCard = createProjectCard(project);
        // Convert DOM element to HTML string
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(projectCard);
        projectsHtml += tempDiv.innerHTML;
    });
    
    projectsHtml += `
                </div>
            </div>
        </div>
    `;
    
    return projectsHtml;
}

function createProjectCard(project) {
    const projectCard = document.createElement('div');
    projectCard.className = 'project-card';

    // Add Personal Project badge if applicable
    if (project.isPersonal) {
        const badge = document.createElement('span');
        badge.className = 'personal-project-badge';
        badge.textContent = 'Personal Project';
        projectCard.appendChild(badge);
    }

    // Project header
    const projectHeader = document.createElement('div');
    projectHeader.className = 'project-header';

    const projectTitle = document.createElement('h5');
    projectTitle.className = 'project-title';
    projectTitle.textContent = project.title;
    projectHeader.appendChild(projectTitle);

    // Project meta information
    const projectMeta = document.createElement('div');
    projectMeta.className = 'project-meta';

    if (project.industry) {
        const industryItem = createMetaItem('Industry', project.industry);
        projectMeta.appendChild(industryItem);
    }

    if (project.timeframe) {
        const timeframeItem = createMetaItem('Duration', project.timeframe);
        projectMeta.appendChild(timeframeItem);
    }

    if (project.completionDate) {
        const completionItem = createMetaItem('Completed', project.completionDate);
        projectMeta.appendChild(completionItem);
    }

    projectHeader.appendChild(projectMeta);
    projectCard.appendChild(projectHeader);

    // Business context
    if (project.businessContext) {
        const contextDiv = document.createElement('div');
        contextDiv.className = 'project-context';
        contextDiv.textContent = project.businessContext;
        projectCard.appendChild(contextDiv);
    }

    // Project outcome
    if (project.outcome) {
        const outcomeDiv = document.createElement('div');
        outcomeDiv.className = 'project-outcome';
        outcomeDiv.textContent = project.outcome;
        projectCard.appendChild(outcomeDiv);
    }

    // Technology stack
    if (project.techStack && project.techStack.length > 0) {
        const techStackSection = document.createElement('div');
        techStackSection.className = 'project-tech-stack';

        const techTitle = document.createElement('div');
        techTitle.className = 'project-tech-title';
        techTitle.textContent = 'Technology Stack';
        techStackSection.appendChild(techTitle);

        const techBadges = document.createElement('div');
        techBadges.className = 'project-tech-badges';

        project.techStack.forEach(tech => {
            const techBadge = document.createElement('div');
            techBadge.className = 'project-tech-badge';
            techBadge.title = tech.alt || tech.tool;

            const techIcon = document.createElement('img');
            techIcon.src = `assets/icons/tools/${tech.tool}.svg`;
            techIcon.alt = tech.alt || tech.tool;
            techIcon.onerror = function() {
                // Fallback if SVG doesn't exist
                this.style.display = 'none';
                const fallbackText = document.createElement('span');
                fallbackText.textContent = tech.tool.charAt(0).toUpperCase();
                fallbackText.className = 'tool-fallback';
                this.parentNode.appendChild(fallbackText);
            };

            techBadge.appendChild(techIcon);
            techBadges.appendChild(techBadge);
        });

        techStackSection.appendChild(techBadges);
        projectCard.appendChild(techStackSection);
    }

    // Key metrics
    if (project.keyMetrics && project.keyMetrics.length > 0) {
        const metricsSection = document.createElement('div');
        metricsSection.className = 'project-metrics';

        const metricsTitle = document.createElement('div');
        metricsTitle.className = 'project-metrics-title';
        metricsTitle.textContent = 'Key Results';
        metricsSection.appendChild(metricsTitle);

        const metricsList = document.createElement('ul');
        metricsList.className = 'project-metrics-list';

        project.keyMetrics.forEach(metric => {
            const metricItem = document.createElement('li');
            metricItem.textContent = metric;
            metricsList.appendChild(metricItem);
        });

        metricsSection.appendChild(metricsList);
        projectCard.appendChild(metricsSection);
    }

    return projectCard;
}

function createMetaItem(label, value) {
    const metaItem = document.createElement('div');
    metaItem.className = 'project-meta-item';

    const labelElement = document.createElement('strong');
    labelElement.textContent = `${label}:`;
    
    const valueElement = document.createElement('span');
    valueElement.textContent = value;

    metaItem.appendChild(labelElement);
    metaItem.appendChild(valueElement);

    return metaItem;
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
        let apiUrl = `${githubConfig.apiEndpoint}?username=${githubConfig.username}&endpoint=commits`;
        
        // Add includeRepos parameter if specified
        if (githubConfig.includeRepos && githubConfig.includeRepos.length > 0) {
            apiUrl += `&includeRepos=${githubConfig.includeRepos.join(',')}`;
        }
        
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
            
            // Parse date correctly to avoid timezone issues
            // day.date is in format "YYYY-MM-DD"
            const [year, month, dayNum] = day.date.split('-').map(Number);
            const date = new Date(year, month - 1, dayNum); // month is 0-indexed
            
            const formattedDate = date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            
            let tooltipText;
            if (day.contributionCount === 0) {
                tooltipText = `No contributions on ${formattedDate}`;
            } else if (day.contributionCount === 1) {
                tooltipText = `1 contribution on ${formattedDate}`;
            } else {
                tooltipText = `${day.contributionCount} contributions on ${formattedDate}`;
            }
            
            calendarHtml += `
                <div class="day contribution-${level}" 
                     data-tooltip="${tooltipText}"
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
    
    // Add custom tooltip functionality after DOM is ready
    setTimeout(() => {
        initializeTooltips(container);
    }, 0);
}

function getContributionLevel(count) {
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    if (count <= 10) return 3;
    return 4;
}

function initializeTooltips(container) {
    // Remove any existing tooltips first
    const existingTooltip = document.querySelector('.tooltip');
    if (existingTooltip) {
        existingTooltip.remove();
    }
    
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    document.body.appendChild(tooltip);
    
    const dayElements = container.querySelectorAll('.day[data-tooltip]');
    console.log('Found', dayElements.length, 'elements with data-tooltip'); // Debug log
    
    dayElements.forEach(dayElement => {
        dayElement.addEventListener('mouseenter', (e) => {
            const tooltipText = e.target.getAttribute('data-tooltip');
            console.log('Tooltip hover:', tooltipText); // Debug log
            
            if (!tooltipText) return;
            
            tooltip.textContent = tooltipText;
            tooltip.style.visibility = 'visible';
            tooltip.classList.add('show');
            
            // Position tooltip above the element
            const rect = e.target.getBoundingClientRect();
            
            // Set initial position to get accurate measurements
            tooltip.style.left = '0px';
            tooltip.style.top = '0px';
            
            const tooltipRect = tooltip.getBoundingClientRect();
            
            let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
            let top = rect.top - tooltipRect.height - 10;
            
            // Ensure tooltip doesn't go off screen horizontally
            if (left < 8) {
                left = 8;
            } else if (left + tooltipRect.width > window.innerWidth - 8) {
                left = window.innerWidth - tooltipRect.width - 8;
            }
            
            // Ensure tooltip doesn't go off screen vertically
            if (top < 8) {
                top = rect.bottom + 10; // Show below instead
            }
            
            tooltip.style.left = left + 'px';
            tooltip.style.top = top + window.scrollY + 'px';
        });
        
        dayElement.addEventListener('mouseleave', () => {
            tooltip.classList.remove('show');
            tooltip.style.visibility = 'hidden';
        });
    });
    
    // Clean up tooltip when it's hidden
    tooltip.addEventListener('transitionend', () => {
        if (!tooltip.classList.contains('show')) {
            tooltip.style.left = '-9999px';
            tooltip.style.top = '-9999px';
            tooltip.style.visibility = 'hidden';
        }
    });
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
        // Store services data globally for resize handler
        window.servicesData = configData.services;
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
    
    // Handle window resize for services layout
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            handleResponsiveLayout();
        }, 250);
    });
});

function handleResponsiveLayout() {
    const isMobile = window.innerWidth <= 768;
    const serviceCards = document.querySelectorAll('.service-card');
    const projectsPanel = document.getElementById('projects-panel');
    
    if (activeServiceIndex !== null && serviceCards[activeServiceIndex]) {
        const activeCard = serviceCards[activeServiceIndex];
        
        if (isMobile) {
            // Remove desktop panel content and add mobile panel if not present
            const existingMobilePanel = activeCard.nextElementSibling;
            if (!existingMobilePanel || !existingMobilePanel.classList.contains('projects-panel')) {
                // Get service data from global storage
                const services = window.servicesData;
                if (services && services[activeServiceIndex]) {
                    const mobilePanelHtml = createMobileProjectsPanel(services[activeServiceIndex]);
                    activeCard.insertAdjacentHTML('afterend', mobilePanelHtml);
                }
            }
            showNoSelectionMessage(); // Clear desktop panel
        } else {
            // Remove mobile panel if present and update desktop panel
            const mobilePanel = activeCard.nextElementSibling;
            if (mobilePanel && mobilePanel.classList.contains('projects-panel')) {
                mobilePanel.remove();
            }
            // Re-render desktop panel
            const services = window.servicesData;
            if (services && services[activeServiceIndex]) {
                renderProjectsPanel(services[activeServiceIndex]);
            }
        }
    }
}