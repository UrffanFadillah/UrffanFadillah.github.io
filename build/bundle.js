
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.42.1' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\components\body\Body.svelte generated by Svelte v3.42.1 */

    const file$2 = "src\\components\\body\\Body.svelte";

    // (31:8) {:else}
    function create_else_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "U-Oh, You just found easter eggs! ;)";
    			attr_dev(p, "class", "tracking-wider leading-relaxed text-xs md:text-sm");
    			add_location(p, file$2, 31, 12, 3137);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(31:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (27:40) 
    function create_if_block_2(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Contact Lorem ipsum dolor sit amet consectetur adipisicing elit. Sequi adipisci, laboriosam hic et nesciunt repellendus distinctio quasi iure asperiores incidunt, molestiae possimus voluptatibus. Incidunt at ipsum adipisci, dolorem accusantium aperiam?";
    			attr_dev(p, "class", "tracking-wider leading-relaxed text-xs md:text-sm");
    			add_location(p, file$2, 27, 12, 2757);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(27:40) ",
    		ctx
    	});

    	return block;
    }

    // (23:37) 
    function create_if_block_1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Work Lorem ipsum dolor sit amet consectetur adipisicing elit. Sequi adipisci, laboriosam hic et nesciunt repellendus distinctio quasi iure asperiores incidunt, molestiae possimus voluptatibus. Incidunt at ipsum adipisci, dolorem accusantium aperiam?";
    			attr_dev(p, "class", "tracking-wider leading-relaxed text-xs md:text-sm");
    			add_location(p, file$2, 23, 12, 2355);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(23:37) ",
    		ctx
    	});

    	return block;
    }

    // (19:8) {#if current === 'aboutMe'}
    function create_if_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "About me Lorem ipsum dolor sit amet consectetur adipisicing elit. Sequi adipisci, laboriosam hic et nesciunt repellendus distinctio quasi iure asperiores incidunt, molestiae possimus voluptatibus. Incidunt at ipsum adipisci, dolorem accusantium aperiam?";
    			attr_dev(p, "class", "tracking-wider leading-relaxed text-xs md:text-sm");
    			add_location(p, file$2, 19, 12, 1952);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(19:8) {#if current === 'aboutMe'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div2;
    	let div0;
    	let button0;
    	let t0;
    	let button0_class_value;
    	let t1;
    	let button1;
    	let t2;
    	let button1_class_value;
    	let t3;
    	let button2;
    	let t4;
    	let button2_class_value;
    	let t5;
    	let div1;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*current*/ ctx[0] === 'aboutMe') return create_if_block;
    		if (/*current*/ ctx[0] === 'work') return create_if_block_1;
    		if (/*current*/ ctx[0] === 'contact') return create_if_block_2;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			t0 = text("About Me");
    			t1 = space();
    			button1 = element("button");
    			t2 = text("Work");
    			t3 = space();
    			button2 = element("button");
    			t4 = text("Contact");
    			t5 = space();
    			div1 = element("div");
    			if_block.c();

    			attr_dev(button0, "class", button0_class_value = /*current*/ ctx[0] === 'aboutMe'
    			? 'cursor-default transition delay-75 duration-150 border-2 border-blue-600 bg-blue-600 hover:bg-blue-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full text-sm md:text-base font-semibold tracking-wide'
    			: 'transition delay-75 duration-150 text-blue-600 border-2 border-blue-600 bg-gray-900 hover:bg-blue-600 hover:text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full text-sm md:text-base font-semibold tracking-wide');

    			add_location(button0, file$2, 7, 8, 213);

    			attr_dev(button1, "class", button1_class_value = /*current*/ ctx[0] === 'work'
    			? 'cursor-default transition delay-75 duration-150 border-2 border-green-600 bg-green-600 hover:bg-green-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full text-sm md:text-base font-semibold tracking-wide'
    			: 'transition delay-75 duration-150 text-green-600 border-2 border-green-600 bg-gray-900 hover:bg-green-600 hover:text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full text-sm md:text-base font-semibold tracking-wide');

    			add_location(button1, file$2, 10, 8, 764);

    			attr_dev(button2, "class", button2_class_value = /*current*/ ctx[0] === 'contact'
    			? 'cursor-default transition delay-75 duration-150 border-2 border-yellow-600 bg-yellow-600 hover:bg-yellow-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full text-sm md:text-base font-semibold tracking-wide'
    			: 'transition delay-75 duration-150 text-yellow-600 border-2 border-yellow-600 bg-gray-900 hover:bg-yellow-600 hover:text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full text-sm md:text-base font-semibold tracking-wide');

    			add_location(button2, file$2, 13, 8, 1311);
    			attr_dev(div0, "class", "flex-1 flex justify-center space-x-2 md:space-x-4");
    			add_location(div0, file$2, 6, 4, 140);
    			attr_dev(div1, "class", "flex-1");
    			add_location(div1, file$2, 17, 4, 1881);
    			attr_dev(div2, "class", "flex flex-col items-left py-6 space-y-2 md:space-y-4 lg:space-y-6");
    			add_location(div2, file$2, 5, 0, 55);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, button0);
    			append_dev(button0, t0);
    			append_dev(div0, t1);
    			append_dev(div0, button1);
    			append_dev(button1, t2);
    			append_dev(div0, t3);
    			append_dev(div0, button2);
    			append_dev(button2, t4);
    			append_dev(div2, t5);
    			append_dev(div2, div1);
    			if_block.m(div1, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[1], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[2], false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*current*/ 1 && button0_class_value !== (button0_class_value = /*current*/ ctx[0] === 'aboutMe'
    			? 'cursor-default transition delay-75 duration-150 border-2 border-blue-600 bg-blue-600 hover:bg-blue-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full text-sm md:text-base font-semibold tracking-wide'
    			: 'transition delay-75 duration-150 text-blue-600 border-2 border-blue-600 bg-gray-900 hover:bg-blue-600 hover:text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full text-sm md:text-base font-semibold tracking-wide')) {
    				attr_dev(button0, "class", button0_class_value);
    			}

    			if (dirty & /*current*/ 1 && button1_class_value !== (button1_class_value = /*current*/ ctx[0] === 'work'
    			? 'cursor-default transition delay-75 duration-150 border-2 border-green-600 bg-green-600 hover:bg-green-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full text-sm md:text-base font-semibold tracking-wide'
    			: 'transition delay-75 duration-150 text-green-600 border-2 border-green-600 bg-gray-900 hover:bg-green-600 hover:text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full text-sm md:text-base font-semibold tracking-wide')) {
    				attr_dev(button1, "class", button1_class_value);
    			}

    			if (dirty & /*current*/ 1 && button2_class_value !== (button2_class_value = /*current*/ ctx[0] === 'contact'
    			? 'cursor-default transition delay-75 duration-150 border-2 border-yellow-600 bg-yellow-600 hover:bg-yellow-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full text-sm md:text-base font-semibold tracking-wide'
    			: 'transition delay-75 duration-150 text-yellow-600 border-2 border-yellow-600 bg-gray-900 hover:bg-yellow-600 hover:text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full text-sm md:text-base font-semibold tracking-wide')) {
    				attr_dev(button2, "class", button2_class_value);
    			}

    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Body', slots, []);
    	let current = "aboutMe";
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Body> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(0, current = "aboutMe");
    	const click_handler_1 = () => $$invalidate(0, current = 'work');
    	const click_handler_2 = () => $$invalidate(0, current = 'contact');
    	$$self.$capture_state = () => ({ current });

    	$$self.$inject_state = $$props => {
    		if ('current' in $$props) $$invalidate(0, current = $$props.current);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [current, click_handler, click_handler_1, click_handler_2];
    }

    class Body extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Body",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\components\heading\Heading.svelte generated by Svelte v3.42.1 */

    const file$1 = "src\\components\\heading\\Heading.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let img;
    	let img_src_value;
    	let t0;
    	let h1;
    	let t1;
    	let t2;
    	let p;
    	let span0;
    	let t4;
    	let span1;
    	let t6;
    	let span2;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			t0 = space();
    			h1 = element("h1");
    			t1 = text(/*name*/ ctx[1]);
    			t2 = space();
    			p = element("p");
    			span0 = element("span");
    			span0.textContent = "UI/UX Designer";
    			t4 = text(" | \r\n        ");
    			span1 = element("span");
    			span1.textContent = "Student";
    			t6 = text(" | \r\n        ");
    			span2 = element("span");
    			span2.textContent = "Frontend Engineer";
    			if (!src_url_equal(img.src, img_src_value = /*imgProfile*/ ctx[0])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "foto");
    			attr_dev(img, "class", "w-24 md:w-32 lg:w-40 rounded-full object-cover");
    			add_location(img, file$1, 5, 4, 146);
    			attr_dev(h1, "class", "text-xl md:text-2xl lg:text-4xl tracking-tight font-bold");
    			add_location(h1, file$1, 6, 4, 242);
    			attr_dev(span0, "class", "text-blue-600 hover:text-blue-500");
    			add_location(span0, file$1, 8, 8, 433);
    			attr_dev(span1, "class", "text-green-600 hover:text-green-500");
    			add_location(span1, file$1, 11, 8, 539);
    			attr_dev(span2, "class", "text-yellow-600 hover:text-yellow-500");
    			add_location(span2, file$1, 14, 8, 640);
    			attr_dev(p, "class", "tracing-wide font-thin text-gray-600 text-xs md:text-sm lg:text-base cursor-default");
    			add_location(p, file$1, 7, 4, 328);
    			attr_dev(div, "class", "flex flex-col items-center py-6 space-y-2 md:space-y-4 lg:space-y-6");
    			add_location(div, file$1, 4, 0, 57);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			append_dev(div, t0);
    			append_dev(div, h1);
    			append_dev(h1, t1);
    			append_dev(div, t2);
    			append_dev(div, p);
    			append_dev(p, span0);
    			append_dev(p, t4);
    			append_dev(p, span1);
    			append_dev(p, t6);
    			append_dev(p, span2);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*imgProfile*/ 1 && !src_url_equal(img.src, img_src_value = /*imgProfile*/ ctx[0])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*name*/ 2) set_data_dev(t1, /*name*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Heading', slots, []);
    	let { imgProfile, name } = $$props;
    	const writable_props = ['imgProfile', 'name'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Heading> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('imgProfile' in $$props) $$invalidate(0, imgProfile = $$props.imgProfile);
    		if ('name' in $$props) $$invalidate(1, name = $$props.name);
    	};

    	$$self.$capture_state = () => ({ imgProfile, name });

    	$$self.$inject_state = $$props => {
    		if ('imgProfile' in $$props) $$invalidate(0, imgProfile = $$props.imgProfile);
    		if ('name' in $$props) $$invalidate(1, name = $$props.name);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [imgProfile, name];
    }

    class Heading extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { imgProfile: 0, name: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Heading",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*imgProfile*/ ctx[0] === undefined && !('imgProfile' in props)) {
    			console.warn("<Heading> was created without expected prop 'imgProfile'");
    		}

    		if (/*name*/ ctx[1] === undefined && !('name' in props)) {
    			console.warn("<Heading> was created without expected prop 'name'");
    		}
    	}

    	get imgProfile() {
    		throw new Error("<Heading>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set imgProfile(value) {
    		throw new Error("<Heading>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get name() {
    		throw new Error("<Heading>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Heading>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.42.1 */
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let heading;
    	let t;
    	let body;
    	let current;

    	heading = new Heading({
    			props: {
    				name: /*propsName*/ ctx[0],
    				imgProfile: /*propsProfile*/ ctx[1]
    			},
    			$$inline: true
    		});

    	body = new Body({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(heading.$$.fragment);
    			t = space();
    			create_component(body.$$.fragment);
    			attr_dev(main, "class", "h-screen mx-auto md:w-4/5 lg:w-3/5 px-4 md:px-0");
    			add_location(main, file, 6, 0, 168);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(heading, main, null);
    			append_dev(main, t);
    			mount_component(body, main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const heading_changes = {};
    			if (dirty & /*propsName*/ 1) heading_changes.name = /*propsName*/ ctx[0];
    			if (dirty & /*propsProfile*/ 2) heading_changes.imgProfile = /*propsProfile*/ ctx[1];
    			heading.$set(heading_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(heading.$$.fragment, local);
    			transition_in(body.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(heading.$$.fragment, local);
    			transition_out(body.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(heading);
    			destroy_component(body);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let { propsName, propsProfile } = $$props;
    	const writable_props = ['propsName', 'propsProfile'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('propsName' in $$props) $$invalidate(0, propsName = $$props.propsName);
    		if ('propsProfile' in $$props) $$invalidate(1, propsProfile = $$props.propsProfile);
    	};

    	$$self.$capture_state = () => ({ propsName, propsProfile, Body, Heading });

    	$$self.$inject_state = $$props => {
    		if ('propsName' in $$props) $$invalidate(0, propsName = $$props.propsName);
    		if ('propsProfile' in $$props) $$invalidate(1, propsProfile = $$props.propsProfile);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [propsName, propsProfile];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { propsName: 0, propsProfile: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*propsName*/ ctx[0] === undefined && !('propsName' in props)) {
    			console.warn("<App> was created without expected prop 'propsName'");
    		}

    		if (/*propsProfile*/ ctx[1] === undefined && !('propsProfile' in props)) {
    			console.warn("<App> was created without expected prop 'propsProfile'");
    		}
    	}

    	get propsName() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set propsName(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get propsProfile() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set propsProfile(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		propsName: 'Urffan Fadillah',
    		propsProfile: 'https://dummyimage.com/400x400/000/fff'		
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
