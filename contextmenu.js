/**
 * Basic Context Menu - v0.0.1
 *
 * Copyright (c) 2015
 * Released under the MIT license.
 *
 * This is an extremely basic context menu library for JavaScript.
 * It has no dependencies.
 *
 * Usage:
 *
 * // The menu object contains a key along with an object describing
 * // the item, or a function which is called when the item is clicked.
 * //
 * // The key can be used to identify which menu option was clicked
 * // in an onSelect handler. The key is also used to perform actions,
 * // such as disable or enable, on the menu item.
 *
 * var menu = {
 *     // Basic menu option: Key and onSelect
 *     "New" : function( target ) { ... },
 *
 *     // More advanced options
 *     "Open" : {
 *         onSelect : function( target ) { ... },
 *         enabled : true, // Use false for disabled, default true
 *         text : "Open...", // Overrides the key, always use if array
 *         title : "Open a file" // Title attribute for menu item
 *     },
 *
 *     // More parameters in onSelect function
 *     "Save" : {
 *         // target : DOM object that was clicked to open menu
 *         // key : The key of the menu object, in this case, "Save"
 *         // item : DOM object of the menu item that was clicked
 *         onSelect : function( target, key, item ) {
 *             ...
 *         }
 *     }
 * }
 *
 * // A selector can be a CSS-like selector
 * selector = ".menus";
 *
 * // Or a jQuery selector
 * selector = $( ".menus" )
 *
 * // Or a DOM object
 * selector = document.getElementById( "menu" )
 *
 * // Or a NodeList
 * selector = document.getElementsByClassName( "menus" )
 *
 * // Attach a menu
 * ContextMenu.attach( selector, menu );
 *
 * // Attach menu with options
 * ContextMenu.attach( ".menus", menu, {
 *     event : "click", // Any valid mouse/touch event
 *     position : "bottom", // One of bottom, top, left, right, or click
 *     horizontalOffset : 0, // Add horizontal offset to position of menu
 *     verticalOffset : 0, // Add vertical offset to position of menu
 * } );
 *
 * // Disable a menu item
 * ContextMenu.disable( selector, "Close" );
 *
 * // Enable a menu item
 * ContextMenu.enable( selector, "Close" );
 *
 */
( function( window ) {
	'use strict';


	var conf = {
		event : "click",
		position : "bottom",
		horizontalOffset : 0,
		verticalOffset : 0
	};

	/**
	 * Target object of context menu. This is the DOM object clicked
	 * on to open the context menu.
	 * @type {HTMLElement}
	 */
	var target = null;


	/**
	 * Class to apply to context menu
	 * @type String
	 */
	var menuClassName = "context-menu";


	/**
	 * Class to apply to conext menu items
	 * @type String
	 */
	var itemClassName = "context-menu-item";


	/**
	 * Class to apply to conext menu items which are disabled
	 * @type String
	 */
	var itemClassNameDisabled = "context-menu-item-disabled";


	///////////////////////////////
	// Helper functions
	///////////////////////////////

	/**
	 * Check if object is a function
	 *
	 * @param {Mixed} obj
	 * @returns {boolean}
	 */
	var isFunction = function( obj ) {
		return !!( obj && obj.constructor && obj.call && obj.apply );
	};



	/**
	 * Check if object is a string
	 *
	 * @param {Mixed} obj
	 * @returns {boolean}
	 */
	var isString = function( obj ) {
		return ( typeof obj === 'string' || obj instanceof String );
	};



	/**
	 * A super simple extend function. This is all that we need
	 * for this library
	 *
	 * @param {Object}
	 * @returns {Object}
	 */
	var extend = function( obj ) {
		var length = arguments.length;

		if ( length < 2 || obj === null ) {
			return obj;
		}

		for ( var idx = 1; idx < length; idx++ ) {
			var source = arguments[ idx ];
			for ( var key in source ) {
				obj[ key ] = source[ key ];
			}
		}

		return obj;
	};



	/**
	 * Get elements based on selector. The selector may be any of a
	 * DOM element, a jQuery object, a css-selector string, or
	 * a NodeList, likely retrieved from .querySelectorAll().
	 *
	 * @param {jQuery|NodeList|String|HTMLElement} selector
	 * @returns {Array|jQuery|NodeList}
	 */
	var getElements = function( selector ) {
		var elements = [];

		if ( typeof jQuery !== "undefined" && selector instanceof jQuery ) {
			return selector;
		}

		if ( selector instanceof HTMLElement ) {
			return [ selector ];
		}

		if ( isString( selector ) ) {
			return document.querySelectorAll( selector );
		}

		if ( selector instanceof NodeList ) {
			return selector;
		}

		return elements;
	};


	///////////////////////////////
	// Private functions
	///////////////////////////////


	/**
	 * Called when a context menu is requested.
	 *
	 * @param {Event} e
	 */
	var onContextMenu = function( e ) {
		e.stopPropagation();
		e.preventDefault();

		target = e.target;
		closeContextMenu();

		if ( target.contextMenu ) {
			// Set up events to process or close context menu
			window.addEventListener( "click", closeContextMenu );
			window.addEventListener( "resize", closeContextMenu );
			window.addEventListener( "scroll", closeContextMenu );

			var menu = createContextMenu( target );
			target.appendChild( menu );

			// On next tick, position menu. We can't do it right
			// away because width and height of menu needs to be computed
			// first.
			setTimeout( function() {
				positionContextMenu( e, target, menu );
				menu.style.visibility = "visible";
			}, 1 );
		}
	};



	/**
	 * Create context menu
	 *
	 * @param {HTMLElement} target The element user clicks on to get context menu
	 * @returns {HTMLElement} The menu
	 */
	var createContextMenu = function( target ) {
		var key;

		var contextMenu = document.createElement( "div" );
		contextMenu.className = menuClassName;

		// Initially hidden until we comput position
		contextMenu.style.visibility = "hidden";
		contextMenu.style.display = "inline-block";

		for ( key in target.contextMenu.menu ) {
			var value = target.contextMenu.menu[ key ];

			var item = document.createElement( "div" );
			item.contextMenu = {
				key : key,
				enabled : value.enabled ? true : false
			};

			if ( item.contextMenu.enabled ) {
				item.className = itemClassName;
			} else {
				item.className = itemClassNameDisabled;
			}
			item.innerHTML = value && value.text ? value.text : key;

			// Assign event listener
			if ( item.contextMenu.enabled ) {
				if ( isFunction( value.onSelect ) ) {
					item.contextMenu.onSelect = value.onSelect;
				} else {
					item.contextMenu.onSelect = onSelect;
				}

				item.addEventListener( target.contextMenu.event, function() {
					this.contextMenu.onSelect( target, this.contextMenu.key, item );
					closeContextMenu();
				} );
			}

			if ( value.title ) {
				item.title = value.title;
			}

			contextMenu.appendChild( item );
		}

		return contextMenu;
	};



	/**
	 * Position the menu relative to the target
	 *
	 * @param {Event} e The event that triggered the display of context menu
	 * @param {HTMLElement} target
	 * @param {HTMLElement} menu
	 */
	var positionContextMenu = function( e, target, menu ) {
		var left = 0;
		var top = 0;
		var targetBox = target.getBoundingClientRect();
		var menuBox = menu.getBoundingClientRect();

		// Default position
		var position = "click";

		if ( target.contextMenu && target.contextMenu.position ) {
			position = target.contextMenu.position;
		}

		if ( position === "bottom" ) {
			// Display below element, left aligned (what about RTL languages?)
			left = targetBox.left + target.contextMenu.horizontalOffset;
			top = targetBox.bottom + target.contextMenu.verticalOffset;
		} else if ( position === "top" ) {
			// Display above element, left aligned (what about RTL languages?)
			left = targetBox.left + target.contextMenu.horizontalOffset;
			top = targetBox.top - menuBox.height + target.contextMenu.verticalOffset;
		} else if ( position === "right" ) {
			// Display to the right of the element, aligned to the top
			left = targetBox.left + targetBox.width + target.contextMenu.horizontalOffset;
			top = targetBox.top + target.contextMenu.verticalOffset;
		} else if ( position === "left" ) {
			// Display to the left of the element, aligned to the top
			left = targetBox.left - menuBox.width + target.contextMenu.horizontalOffset;
			top = targetBox.top + target.contextMenu.verticalOffset;
		} else {
			// Display wherever the user clicked the mouse
			left = e.clientX + target.contextMenu.horizontalOffset;
			top = e.clientY + target.contextMenu.verticalOffset;
		}

		// Check if off screen

		// Too far to the left?
		if ( left < 0 ) {
			if ( target.contextMenu.horizontalOffset >= 0 ) {
				left = target.contextMenu.horizontalOffset;
			} else {
				left = 0;
			}
		}

		// Too far up?
		if ( top < 0 ) {
			if ( target.contextMenu.verticalOffset >= 0 ) {
				top = target.contextMenu.verticalOffset;
			} else {
				top = 0;
			}
		}

		// Too far to the right?
		if ( left + menuBox.width > screen.width ) {
			if ( target.contextMenu.horizontalOffset >= 0 ) {
				left = screen.width - menuBox.width;
			} else {
				left = screen.width - menuBox.width + target.contextMenu.horizontalOffset;
			}
		}

		// Too far to the bottom?
		if ( top + menuBox.height > screen.height ) {
			if ( target.contextMenu.verticalOffset >= 0 ) {
				top = screen.height - menuBox.height;
			} else {
				top = screen.height - menuBox.height + target.contextMenu.verticalOffset;
			}
		}

		// And finally, apply to positioning to the menu
		menu.style.left = left + "px";
		menu.style.top = top + "px";
	};



	/**
	 * Default onSelect routine if client failed to pass one in
	 *
	 * @param {HTMLElement} target The DOM element which context menu is applied to
	 * @param {String} key Key related to menu
	 * @param {HTMLElement} item The item clicked
	 */
	var onSelect = function( target, key, item ) {
		// TODO: Maybe throw an event
	};



	/**
	 * Close any context menus (there should be only one!) that
	 * currently exist.
	 */
	var closeContextMenu = function() {
		var idx = 0;
		var elements = document.getElementsByClassName( menuClassName );

		// Remove event listeners. If they don't exist, nothing will happen.
		window.removeEventListener( "click", closeContextMenu );
		window.removeEventListener( "resize", closeContextMenu );
		window.removeEventListener( "scroll", closeContextMenu );

		for ( idx = 0; idx < elements.length; idx++ ) {
			elements[ idx ].parentNode.removeChild( elements[ idx ] );
		}
	};



	/**
	 * Set the enabled state of a menu item
	 * @param {jQuery|NodeList|String|HTMLElement} selector
	 * @param {String|int} key Key in menu object
	 * @param {boolean} enabled
	 */
	var setEnabledState = function( selector, key, enabled ) {
		var idx = 0;

		// Get list of elements to attach context menu to
		var elements = getElements( selector );

		// Disable each menu element
		for ( idx = 0; idx < elements.length; idx++ ) {
			if ( elements[ idx ].contextMenu.menu.hasOwnProperty( key ) ) {
				elements[ idx ].contextMenu.menu[ key ].enabled = enabled;
			}
		}
	};



	/**
	 * Normalize a menu structure so that all properties are present
	 *
	 * @param {Object} menu
	 * @returns {Object}
	 */
	var normalizeMenu = function( menu ) {
		var idx;
		var itemDefaults = {
			type : "item",
			enabled : true,
			text : "",
			onSelect : function() {},
			icon : "",  // This isn't used yet
			title : ""
		};

		// Quick normalization of menu object
		for ( idx in menu ) {
			if ( ! menu[ idx ] ) {
				menu[ idx ] = extend( { text : idx }, itemDefaults );
			} else if ( isFunction( menu[ idx ] ) ) {
				menu[ idx ] = extend( { text : idx, onSelect : menu[ idx ] }, itemDefaults );
			} else {
				menu[ idx ] = extend( itemDefaults, menu[ idx ] );
			}
		}

		return menu;
	};



	///////////////////////////////
	// Public API
	///////////////////////////////
	var ContextMenu = {

		/**
		 * Attach a context menu to one or more elements. This is the
		 * API that will be used most often.
		 *
		 * @param {jQuery|NodeList|HTMLElement|String} selector
		 * @param {Array|Object} menu
		 * @param {Object} options
		 */
		attach : function( selector, menu, options ) {
			var idx = 0;

			menu = normalizeMenu( menu );

			// Create object to associate with element(s).
			// extend() is used so that each element gets a unique copy.
			var obj = extend( { menu : extend( {}, menu ) }, conf, options );

			// Get list of elements to attach context menu to
			var elements = getElements( selector );

			// Attach context menu to each element
			for ( idx = 0; idx < elements.length; idx++ ) {
				elements[ idx ].contextMenu = obj;
				elements[ idx ].addEventListener( obj.event, onContextMenu );
			}
		},



		/**
		 * Disable a menu items
		 *
		 * @param {jQuery|NodeList|HTMLElement|String} selector
		 * @param {String|int} key The key passed in to the menu object in .attach()
		 */
		disable : function( selector, key ) {
			setEnabledState( selector, key, false );
		},



		/**
		 * Disable a menu items
		 *
		 * @param {jQuery|NodeList|HTMLElement|String} selector
		 * @param {String|int} key The key passed in to the menu object in .attach()
		 */
		enable : function( selector, key ) {
			setEnabledState( selector, key, true );
		},



		/**
		 * Close context menu(s)
		 */
		close : function() {
			closeContextMenu();
		}
	};



	/**
	 * Expose
	 */
	// AMD
	if ( typeof window.define === "function" && window.define.amd !== undefined ) {
		window.define( 'ContextMenu', [], function () {
			return ContextMenu;
		} );
	// CommonJS
	} else if ( typeof module !== "undefined" && module.exports !== undefined ) {
		module.exports = ContextMenu;
	// Browser
	} else {
		window.ContextMenu = ContextMenu;
	}
} )( this );