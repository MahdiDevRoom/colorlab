const Theme = {
    html: document.documentElement,
    switchElm: document.querySelector('#themeSwitch'),

    init() {
        let savedTheme = localStorage.getItem('theme');
        if (!savedTheme) {
            savedTheme = 'light';
            localStorage.setItem('theme', savedTheme);
        }
        this.set(savedTheme);

        this.switchElm.checked = savedTheme === 'dark';
        this.switchElm.addEventListener('change', () => this.toggle());
    },

    current() {
        return this.html.getAttribute('theme');
    },

    set(name) {
        freeze(undefined, {
            '.c-switch': 'left, width, height',
            '#menu label': 'scale',

        });
        this.html.setAttribute('theme', name);
        localStorage.setItem('theme', name);
        this.switchElm.checked = name === 'dark';
        StatusBar.reload();
    },

    toggle() {
        const newTheme = this.current() === 'light' ? 'dark' : 'light';
        this.set(newTheme);
    },

};
const Menu = {
    menuElm: document.querySelector('#menu'),
    backdropElm: document.querySelector('#backdrop'),

    init() {
        this.backdropElm.onclick = () => this.close();
        window.addEventListener('scroll', () => this.close());
    },

    isOpen() {
        return this.menuElm.classList.contains('show');
    },
    open() {
        if (this.isOpen()) return;
        this.menuElm.classList.add('show');
        this.backdropElm.classList.add('show');
    },
    close() {
        if (!this.isOpen()) return;
        this.menuElm.classList.remove('show');
        this.backdropElm.classList.remove('show');
    },
    toggle() {
        this.isOpen() ? this.close() : this.open();
    }
};
const Page = {
    index: null,
    pageElement: null,
    spinner: null,
    current: null,
    offset: 0,
    target: new EventTarget(),

    init(config) {
        this.index = config.index;
        this.pageElement = config.pageElement;
        this.spinner = config.spinner;
        this.offset = config.offset;

        window.addEventListener("DOMContentLoaded", () => {
            let hash = location.hash.slice(1);
            if (!hash) location.hash = hash = this.index;
            this.open(hash, false);
        });

        window.addEventListener("hashchange", () => this.open(location.hash.slice(1), false));
        window.addEventListener("popstate", (event) => {
            const hash = event.state?.page || this.index;
            this.open(hash, false);
        });
    },

    parseInput(input) {
        const index = input.indexOf('-');
        if (index === -1) return [input, ''];
        return [input.slice(0, index), input.slice(index + 1)];
    },

    open(input, addHistory = true) {
        let [name, section] = this.parseInput(input);

        this.loading(name, section);

        fetch(`./pages/${name}.html`)
            .then(res => {
                if (!res.ok) throw new Error('Page not found');
                return res.text();
            })
            .then(data => {
                this.pageElement.innerHTML = data;
                this.dispatchEvent('load' ,{name, section});

                if (section) {
                    queueMicrotask(() => {
                        const elm = document.getElementById(section);
                        if (!elm) return;

                        const offset = this.offset;
                        const y =
                            elm.getBoundingClientRect().top +
                            window.pageYOffset -
                            offset;

                        window.scrollTo({
                            top: y,
                            behavior: "smooth"
                        });
                    });
                } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }

                if (addHistory && this.current !== input)
                    history.pushState(input, "", `#${input}`);

                this.current = input;
            })
            .catch(() => {
                if (name !== 'home') {
                    history.replaceState({ page: 'home' }, "", "#home");
                    this.open('home', false);
                }
            });
    },

    loading(name, section) {
        this.dispatchEvent('start', {name, section});
        this.pageElement.innerHTML = this.spinner;
    },

    dispatchEvent(name, detail = {}) {
        this.target.dispatchEvent(new CustomEvent(name, { detail }));
    },

    set onload(callback) {
        this.target.addEventListener('load', (e) => callback(e.detail));
    },
    set onstart(callback) {
        this.target.addEventListener('start', (e) => callback(e.detail));
    },


}
const Scroll = {
    header: document.querySelector('header'),
    fab: document.querySelector('#fab'),
    body: document.body,
    init() {
        this.body.onscroll = () => this.scroll();
        this.fab.onclick = () => scrollTo({ top: 0, behavior: 'smooth' });
    },
    scroll() {
        this.header.classList.toggle('sticky', scrollY >= 100);
        this.fab.classList.toggle('show', scrollY >= 300);
        scrollY >= 100 ? StatusBar.set('background') : StatusBar.set('surface');
    }
}
const StatusBar = {
    init() {
        this.rootStyles = getComputedStyle(document.documentElement);
        this.themeColorMeta = document.querySelector('meta[name="theme-color"]');
        this.color = 'surface';
    },
    set(varible) {
        this.themeColorMeta.setAttribute('content', this.rootStyles.getPropertyValue(`--${varible}`).trim());
    },
    reload() {
        this.themeColorMeta.setAttribute('content', this.rootStyles.getPropertyValue(`--${this.color}`).trim());

    }
}
function freeze(duration = 100, exceptions = {}) {
    const css = document.createElement("style");
    const selectors = Object.keys(exceptions);
    const notClause = selectors.length > 0 ? `:not(${selectors.join(', ')})` : "";
    let exceptionRules = "";
    for (const [selector, properties] of Object.entries(exceptions)) {
        exceptionRules += `
            ${selector} {
                transition-property: ${properties} !important;
                transition-duration: inherit !important; 
                transition-timing-function: inherit !important;
                animation: inherit !important; 
            }
        `;
    }

    css.innerText = `
        *${notClause}, *${notClause}::before, *${notClause}::after {
            transition: none !important;
            animation: none !important;
        }
        
        ${exceptionRules}
    `;

    document.head.appendChild(css);
    window.getComputedStyle(css).opacity;
    setTimeout(() => {
        if (document.head.contains(css)) {
            document.head.removeChild(css);
        }
    }, duration);
}


StatusBar.init();
Theme.init();
Menu.init();
Page.init({
    index: 'home',
    offset: 86,
    pageElement: document.querySelector('#page'),
    spinner: '<main class="spinner"><div><span></span><span></span><span></span><span></span></div></main>'
});
Scroll.init();

Page.onstart = (page) => {
    let active = document.querySelector('#navigation .active');
    let target = document.querySelector(`#navigation [name="${page.name}"]`);

    console.log(target);
    
    

    if(active) active.classList.remove('active');
    target.classList.add('active');
    Menu.close();
}

Page.onload = (page) => {
    let title = document.querySelector('header .title');
    switch (page.name) {
        case 'home':
            title.innerHTML = 'ColorLab.js';
            hljs.highlightAll();
            break;
        case 'docs':
            title.innerHTML = 'Documents';
            hljs.highlightAll();
            break
        case 'changelog':
            title.innerHTML = 'Changelog';
            break
    }
}
less.pageLoadFinished.then(() => {
    StatusBar.reload();
});
