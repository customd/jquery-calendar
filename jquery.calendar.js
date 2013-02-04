/**
 * jQuery calendar plug-in 1.0.3
 * Copyright 2012, Digital Fusion
 * Licensed under the MIT license.
 * http://opensource.teamdf.com/license/
 *
 * @author Sam Sehnert | sam@teamdf.com
 * @docs http://opensource.teamdf.com/calendar/docs/ 
 * 
 * Implement an extremely flexible calendar interface with minimal up front development.
 */

(function($){
	"use strict";
	
	// The name of your plugin. This is used to namespace your
	// plugin methods, object data, and registerd events.
	var plugin_name		= 'cal';
	var plugin_version	= '1.0.2';
	
	var const_month		= 'month';
	var const_week		= 'week';
	
	// Set up the plugin defaults.
	// These will be stored in $this.data(plugin_name).settings,
	// and can be overwritten by having 'options' passed through
	// as the parameter to the init method.
	var defaults = {
		
		// Start date and days to display.
		startdate		: null,			// Defaults to new Date() if none of start month/year/monthstodisplay are defined.
		daystodisplay	: null,			// Defaults to 7 if none of start month/year/monthstodisplay are defined.
		
		// Start month,year and months to display.
		startmonth		: null,			// Defaults to (new Date()).getMonth()+1 if monthstodisplay or startyear are defined (we use 1-12, not 0-11).
		startyear		: null,			// Defaults to (new Date()).getFullYear() if monthstodisplay or startmonth are defined.
		monthstodisplay	: null,			// Defaults to 1 if either of startmonth or startyear are defined. TODO: Support more than one month???
				
		// Default colors
		defaultcolor	: '#255BA1',
		invalidcolor	: '#888888',
		
		// Date Masks
		maskmonthlabel			: 'l',
		maskeventlabel			: 'g:i A',
		maskeventlabeldelimiter : '', // &ndash;
		maskeventlabelend 		: '', // g:i A
		maskdatelabel			: 'D, jS',
		masktimelabel			: {
			'00'	: 'g:i <\\sp\\a\\n>A<\/\\sp\\a\\n>',
			'noon'	: '\\N\\O\\O\\N'
		},
		
		// Either false, or an array of resources.
		resources		: false,
		
		// Default height and widths.
		minwidth		: 130,
		minheight		: null,
		overlapoffset	: 15,
		
		// Start and end times for the days
		daytimestart	: '00:00:00',
		daytimeend		: '24:00:00',
		
		// Which day the week starts on 1-7, 1 being Sunday, 7 being Saturday.
		weekstart		: 1,
		
		// Other options...
		dragincrement	: '15 mins',
		gridincrement	: '15 mins',
		creationsize	: '15 mins',
		
		// Global appointment permissions
		allowcreation	: 'both',		// Options, 'both', 'click', 'drag', 'none', false.
		allowmove		: false,		// Enable or disable appointment dragging/moving.
		allowresize		: false,		// Enable or disable appointment resizing.
		allowselect		: false,		// Enable or disable appointment selection.
		allowremove		: false,		// Enable or disable appointment deletion.
		allowoverlap	: false,		// Enable or disable appointment overlaps.	
		allownotesedit	: false,		// Enable or disable inline notes editing.
		
		// Easing effects
		easing			: {
			eventupdate		: 'linear',
			eventremove		: 'linear',
			eventeditin		: 'linear',
			eventeditout	: 'linear',
			datechange		: 'linear'
		},
		
		// appointment events.
		eventcreate		: $.noop,
		eventnotesedit	: $.noop,
		eventremove		: $.noop,
		eventselect		: $.noop,
		eventmove		: $.noop,
		eventresize		: $.noop,
		
		// day events
		dayclick		: $.noop,
		daydblclick		: $.noop,
		
		// Other events.
		onload			: $.noop
	};
	
	var _private = {
		/**
		 * Attached to several elements to prevent default actions.
		 *
		 * @param object e		: An object representing the event that triggered this method.
		 *
		 * @return void
		 */
		prevent : function(e){ e.preventDefault(); },
		
		/**
		 * Get the scrollbar width so we know how much space to allocate.
		 *
		 * @return int : Returns the width of the scrollbars in pixels.
		 */
		scrollbarSize : function() {
			
			// Use the cached version if exists.
			if (!_private._scrollbarSize) {
			
				var $doc = $(document.body),
				
				// Set the overflow to hidden, scroll and measure difference.
				w =$doc.css({overflow:'hidden'}).width();
				w-=$doc.css({overflow:'scroll'}).width();
				
				// Add support for IE in Standards mode.
				if(!w) w=$doc.width()-$doc[0].clientWidth;
				
				// Restore the overflow setting.
				$doc.css({overflow:''});
				
				// Cache the scrollbar width.
				_private._scrollbarSize = w;
			}
			
			// Return the width.
			return _private._scrollbarSize;
		},
		
		// Cache the scrollbar size here.
		_scrollbarSize : false,

		/**
		 * Called with a jquery collection of textareas and/or input boxes as 'this'.
		 * Allows setting a selecting text easily cross browser.
		 *
		 * @param int start		: The start index in the string that we should select from.
		 * @param int end		: The end index in the string that we should select to.
		 *
		 * @return object		: Returns the jquery collection that was passed as 'this'.
		 */
		selectrange : function(start, end) {
		    return this.each(function() {
		        if(this.setSelectionRange) {
		            this.focus();
		            this.setSelectionRange(start, end);
		        } else if(this.createTextRange) {
		            var range = this.createTextRange();
		            range.collapse(true);
		            range.moveEnd('character', end);
		            range.moveStart('character', start);
		            range.select();
		        }
		    });
		},
		
		/**
		 * Called when the scroll container elment is scrolled. Attached to the onscroll event.
		 *
		 * @param object e		: An object representing the event that triggered this method.
		 *
		 * @return void
		 */
		onscroll : function(e){
			// Called on scroll on the container element.
			
			// Init the variables we'll need. 
			var $this	= $(this),
				$parent = $this.parent('.ui-'+plugin_name+'-container'),
				scrollX = $this.scrollLeft(),
				scrollY = $this.scrollTop(),
				data	= $parent.data(plugin_name);
			
			if( data ){
				// Position the date and timeline at the correct scroll position.
				$parent.find('.ui-'+plugin_name+'-timeline').scrollTop(scrollY);
				$parent.find('.ui-'+plugin_name+'-dateline').scrollLeft(scrollX);
				$parent.find('.ui-'+plugin_name+'-resourceline').scrollLeft(scrollX);
			}
		},
		
		/**
		 * Check to see if a number or date is between start and end.
		 *
		 * @param mixed item	: The item we want to compare with start and end.
		 * @param mixed start	: The beginning of the range we want to check item against.
		 * @param mixed end		: The end of the range we want to check item against.
		 *
		 * @return bool			: Returns true if item falls between the range start - end.
		 */
		between : function( item, start, end ){
			
			// If we're dealing with a date.
			if( item instanceof Date ){
				
				var timestamp = item.getTime();
				
				return ( timestamp >= start.getTime() && timestamp <= end.getTime() );
			
			// If we're dealing with a number.
			} else if( !isNaN( Number( item ) ) ){
				
				return ( item >= start && item <= end );
			}
			
			return false;
		},
		
		/**
		 * Check to see if a date range overlaps any part of a second range.
		 *
		 * @param date partStart			:
		 * @param date partEnd				:
		 * @param date inStart				:
		 * @param date inEnd				:
		 *
		 * @return bool : in range, or not.
		 */
		inrange : function( partStart, partEnd, inStart, inEnd )
		{
			return !( partEnd.getTime() < inStart.getTime() || partStart.getTime() > inEnd.getTime() );
		},
		
		
		/**
		 * Called to get a resource at a given index from the settings object.
		 *
		 * @param int index		: A number representing the index position of the resouce data we want.
		 * @param object data	: Am object containing the plugin data (which we'll use to get the resources).
		 *
		 * @return object		: The resource object at the given index.
		 */
		resource : function( index, data ){
			
			var iterator = 0;
			
			if( data.settings.resources !== false ){
				for( var i in data.settings.resources ){
					if( data.settings.resources.hasOwnProperty( i ) ){
						if( iterator == index ){
							return { 'id' : i, 'name' : data.settings.resources[i] };
						}
						iterator++;
					}
				}
			}
			
			return { 'id' : null, 'name' : null };
		},
		
		/**
		 * Called to get the index of a given resource item in the settings object.
		 *
		 * @param mixed id		: A string or number type which represents the resource key of the resource index we want returned.
		 * @param object data	: An object containing the plugin data (which we'll use to get the resources).
		 *
		 * @return int			: Returns the index position of the passed resource in the settings object.
		 */
		resourceIndex : function( id, data ){
			
			var index = 0;
			
			if( data.settings.resources !== false ){
				
				// If we've been given a straight array of keys, then
				// we only check against the value.
				
				if( $.isArray( data.settings.resources ) ){
					for( var i in data.settings.resources ){
						if( data.settings.resources[i] == id ){
							return index;
						}
						index++;
					}
				} else {
					for( var i in data.settings.resources ){
						if( data.settings.resources.hasOwnProperty( i ) ){
							if( i == id ){
								return index;
							}
							index++;
						}
					}
				}
			}
			
			return false;
		},
		
		/**
		 * Parse event overlaps for the given event.
		 *
		 * @param date begin		: The beginning of the range that we want to check for overlaps.
		 * @param date end			: The end of the range that we want to check for overlaps.
		 * @param object resource	: A resource id / label object if we want to check for overlaps on resources too.
		 *
		 * @return void;
		 */
		overlaps : function( begin, end, resource ){
			
			// Get variables that we'll use later.
			var $this		= $(this),
				data		= $this.data(plugin_name),
				check		= [];
			
			// If the calendar has been implemented on this object.
			if( data ){
				
				// Store shortcut to events array.
				var events = data.cache.events;
				
				// Loop through the cached event data.
				for( var uid in events ){
					
					if( // Part of the event falls into the date range that we're checking.
						events.hasOwnProperty(uid) &&
						(
							events[uid].begins < end &&
							events[uid].ends > begin &&
							events[uid].resource === resource
						)
					){
						// Initialise the overlap object.
						events[uid].overlap = {
							partial		: true,
							inset		: 0,
							count		: 0,
							items		: {},
							uid			: uid
						};
						
						check.push(events[uid]);
					}
				}
				
				// We only need to check if there is more than one appointment in this time span.
				if( check.length > 1 ){
					
					// Sort by start date.
					check.sort(function(a,b){ return a.begins.getTime()-b.begins.getTime(); });
					
					// Loop through each of the events that in the date range,
					// and build up the overlap settings.
					for( var uid1 in check ){
						
						// Make sure this property exists on the object (not a prototyped property).
						if( check.hasOwnProperty(uid1) ){
							
							// Loop through each of the events and compare.
							for( var uid2 in check ){
								
								// Skip this... we don't need to compare the same object.
								if( uid1 === uid2 ) continue;
								
								if( // These object overlap AND they haven't already been flagged as overlapping.
									check.hasOwnProperty(uid2) &&
									!( check[uid1].overlap.uid in check[uid2].overlap.items ) &&
									!( check[uid2].overlap.uid in check[uid1].overlap.items ) &&
									(
										check[uid1].begins < check[uid2].ends &&
										check[uid1].ends > check[uid2].begins &&
										check[uid1].resource === check[uid2].resource
									)
								){
									
									// Store a reference to the overlapped object.								
									check[uid1].overlap.items[check[uid2].overlap.uid] = check[uid2];
									check[uid2].overlap.items[check[uid1].overlap.uid] = check[uid1];
									check[uid1].overlap.count++;
									check[uid2].overlap.count++;
														
									if( // The begin times are exactly the same...
										check[uid1].begins.getTime() == check[uid2].begins.getTime()
									){
										
										// Set these up as non-partial overlaps.
										check[uid1].overlap.partial = false;
										check[uid2].overlap.partial = false;
										
										// Set the new inset for non-partial overlaps.
										check[uid2].overlap.inset = check[uid1].overlap.inset+1;
									
									} else if( // The begins time is less than the ends time.
										check[uid1].begins.getTime() < check[uid2].begins.getTime()
									){
										
										// Increment the inset if this is a partial overlap.
										if( check[uid1].overlap.partial ) check[uid2].overlap.inset++;
										
									} else {
										
										// Increment the first appointments inset if this is a partial overlap.
										if( check[uid2].overlap.partial ) check[uid1].overlap.inset++;
										
									}
									
									// Update the cache.
									data.cache.events[check[uid1].overlap.uid] = check[uid1];
									data.cache.events[check[uid2].overlap.uid] = check[uid2];
								}
							}
						}
					}
					
					// Update each of the overlap items data.
					for( var uid in check ) check[uid].elems.data(plugin_name,check[uid]);
				}
				
				// Update the plugin data.
				$this.data(plugin_name,data);
			}
		},
		
		// Error objects used by the calendar
		errors : {
			
			eventParse : function( message, event ){
				
				// Create a new error object
				var error		= new Error( message );
					error.type	= 'EventParse';
					error.event	= event;
				
				// Return the error object (usually to throw).
				return error;
			},
			
			icsParse : function( message, line, value ){
				
				// Create a new error object
				var error		= new Error( message );
					error.type	= 'ICSParse';
					error.line	= line;
					error.value	= value;
				
				// Return the error object (usually to throw).
				return error;
			}
		},
		
		// Holds the event parser methods.
		parse : {
			
			// Patterns for parsing ICS files.
			_icalendar : {
				// Folded lines: start with a whitespace character */
				folds	 : /^\s(.*)$/,
				// Individual entry: name:value */
				entry	 : /^([A-Za-z0-9-]+)((?:;[A-Za-z0-9-]+=(?:"[^"]+"|[^";:,]+)(?:,(?:"[^"]+"|[^";:,]+))*)*):(.*)$/,
				// Individual parameter: name=value[,value] */
				param	 : /;([A-Za-z0-9-]+)=((?:"[^"]+"|[^";:,]+)(?:,(?:"[^"]+"|[^";:,]+))*)/g,
				// Individual parameter value: value | "value" */
				value	 : /,?("[^"]+"|[^";:,]+)/g,
				// Date only field: yyyymmdd */
				date	 : /^(\d{4})(\d\d)(\d\d)$/,
				// Date/time field: yyyymmddThhmmss[Z] */
				time	 : /^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)(Z?)$/,
				// Date/time range field: yyyymmddThhmmss[Z]/yyyymmddThhmmss[Z] */
				range	 : /^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)(Z?)\/(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)(Z?)$/,
				// Timezone offset field: +hhmm */
				offset	 : /^([+-])(\d\d)(\d\d)$/,
				// Duration: [+-]PnnW or [+-]PnnDTnnHnnMnnS */
				duration : /^([+-])?P(\d+W)?(\d+D)?(T)?(\d+H)?(\d+M)?(\d+S)?$/
			},
			
			/**
			 * Parses iCalendar (RFC 2445) into a javascript object.
			 *
			 * @param string ics	: An iCalendar formatted string.
			 *
			 * @return object : Returns a javascript object representing the passed iCalendar format.
			 */
			icalendar : function( ics ){
				
				var err			= _private.errors.icsParse,
					parse		= _private.parse._icalendar,
					parsing		= 'cal_begin',
					calendars	= [],
					lines		= ics.replace(/\r\n/g,'\n').split('\n'),
					event		= null,
					calendar	= null;
					
				for( var i=lines.length-1; i>0; i-- ){
					var matches = parse.folds.exec(lines[i]);
					if( matches ){
						lines[i-1] += matches[1];
						lines[i] = '';
					}
				}
				
				$.each(lines,function(i,line){
				
					// Skip blank lines.
					if( !line ) return;
										
					switch( parsing ){
						
						//case 'done' : If we decide to support more than one calendar in the same ics.
						case 'cal_begin' :
							// Check for calendar begin.
							if( line.indexOf('BEGIN:VCALENDAR')==-1 ) throw new err( 'Expecting BEGIN:VCALENDAR but found \''+line+'\' instead.', i, line );
							
							// Initialise the calendar object.
							calendar = {events:[]};
							parsing = 'cal_info';
						break;
						
						case 'cal_info' :
							// Check for a change in parsing mode.
							if( line.indexOf('BEGIN:VEVENT')==0 ){ event = {}; parsing = 'cal_event' };
							if( line.indexOf('END:VCALENDAR')==0 ){ calendars.push(calendar); parsing = 'done' };
							
							// If parsing mode has changed, continue with next line.
							if( parsing !== 'cal_info' ) return;
						break;
						
						case 'cal_event' :
							// Check for a change in parsing mode.
							if( line.indexOf('END:VEVENT')==0 ){ calendar.events.push(event); parsing = 'cal_info' };
							
							// If parsing mode has changed, continue with next line.
							if( parsing !== 'cal_event' ) return;
							
							// Match an entry line.
							var matches = parse.entry.exec(line);
							if (!matches) {
								throw new err( 'Missing entry name.', i, line );
							}
							
							// Parse the different date values.
							switch( matches[1].toLowerCase() ){
								case 'uid'		: event.uid		= matches[3]; break;
								case 'dtstart'	: event.begins	= $[plugin_name].date( matches[3] ); break;
								case 'dtend'	: event.ends	= $[plugin_name].date( matches[3] ); break;
								case 'summary'	: event.notes	= matches[3]; break;
							}
						break;
					}
				});
				
				// Throw an error if we didn't find group end.
				if( parsing !== 'done' ) throw new err( 'Unexpected end of file. Expecting END:VCALENDAR.', lines.length, '' );
				
				// Return the parsed calendars.
				return calendars.length > 0 ? calendars.pop() : false;
			}			
		},
		
		// Pseudo events used by the calendar.
		event : {
			
			/**
			 * Returns the number of elements required to draw the event.
			 *
			 * @param obj values	: Should be a fully validated values object, with minimum of begins, ends timestamps.
			 *
			 * @return int : The number of elements that should be drawn (the number of days that this element spans, visually).
			 */
			calculateElementCount : function( values ){
				// Return the number of elements that should be drawn for this object.
				return Math.ceil( values.cache.begins.getDaysBetween( values.cache.ends, true ) )+1;
			},
			
			/**
			 * Positions an event object on the screen according to its data object.
			 *
			 * @param mixed speed	: (opt) If int is number of milleseconds for animation, or string 'fast', 'slow'. If undefined, no animation.
			 * @param string ease	: (opt) The easing method to use. See jQuery easing documentation for details.
			 *
			 * @return void
			 */
			update : function( bData, speed, ease ){

				// Clone the event element, and set up the values.
				var $event	= $(this),
					values	= $event.data(plugin_name),
					data	= values && values.calendar ? values.calendar.data(plugin_name) : false ;
				
				// Make sure we've got values.
				if( data && values ){
					
					// Get each of the event elements.
					var $events = values.elems;
					
					// Set the new values.
					if( 'begins' in bData ) values.begins	= $[plugin_name].date( bData.begins );
					if( 'ends' in bData )	values.ends		= $[plugin_name].date( bData.ends );
					if( 'color' in bData )	values.colors	= bData.color ? $[plugin_name].colors.generate( bData.color ) : data.settings.defaultcolor;
					if( 'title' in bData )	values.title	= bData.title || null;
					if( 'notes' in bData )	values.notes	= bData.notes || '';
					
					// Exit if there's no need to draw anything.
					if( values.ends < data.settings.startdate || values.begins > data.cache.enddate ) return false;
					
					// Work out the cached end date.
					values.cache.ends = ( data.cache.enddate < values.ends ? data.cache.enddate.addSeconds(-1) : values.ends );
					values.cache.begins = ( data.settings.startdate > values.begins ? data.settings.startdate.copy() : values.begins );
					
					// Set the new value into the event data.
					$events.find('pre.details').text( values.notes );
					$events.find('p.title').text( 
						values.title || ( values.begins.format(data.settings.maskeventlabel) + 
							(
								data.settings.maskeventlabelend !== '' ? data.settings.maskeventlabeldelimiter + values.ends.format( data.settings.maskeventlabelend ) : ''
							)
						)
					);
															
					// Save the new values to the element.
					$events.data(plugin_name,values);
					data.cache.events[values.uid] = values;
					values.calendar.data(plugin_name,data);
					
					// Call the positioning code.
					_private.draw[data.type].position.apply($events,[speed,ease]);
					return true;
				}
				return false;
			},
			
			/**
			 * Creates an inline edit area for an appointment's description.
			 *
			 * @param object e		: An object representing the event that triggered this method.
			 *
			 * @return void
			 */
			edit : function( e ){
				
				var $event	= e && !$(this).is('div.ui-'+plugin_name+'-event') ? $(this).parents('div.ui-'+plugin_name+'-event') : $(this),
					values		= $event.data(plugin_name),
					data		= values && values.calendar ? values.calendar.data(plugin_name) : false ;
				
				if( data && values ){
					
					// Exit now if we don't allow selection.
					if( !data.settings.allownotesedit ) return;
					
					// Set the notes base height.
					var $notes		= $event.find('pre.details'),
						noteHeight	= $notes.height();
					
					// Now append the textarea.
					var $textarea = $('<textarea class="details" />').text(values.notes||'').css({
						boxShadow : 'inset 0px 0px 6px '+values.colors.mainShadow
					}).on('mousedown.'+plugin_name,function(e){e.stopPropagation()}).appendTo($event);
					
					if( $event.height() <= 30 ){
						
						// Work out the margin to use.
						var marginSide	= $event.height() <= 15 ? 4 : 1 ,
							marginTop	= $event.height() <= 15 ? -1 : 0 ; 
						
						// Unbind the double click handler while we're showing the dropdown.
						// Also, stop (and complete) the animations on the parent, otherwise
						// it can cause some weird animation issues.
						$event.unbind('dblclick.'+plugin_name).stop(true,true);
						$textarea.css({
							
							marginTop				: marginTop,
							left					: marginSide,
							right					: marginSide,
							height					: noteHeight,
							border					: '1px solid '+values.colors.mainSelected,
							borderTop				: 'none',
							borderTopLeftRadius		: 0,
							borderTopRightRadius	: 0,
							opacity					: 0,
							overflow				: 'hidden',
							zIndex					: 1
							
						}).animate({ height: 45, opacity: 1 },'fast',data.settings.easing.eventeditin,function(){
							
							// Make sure the body is scrollable.
							$(this).css('overflow', 'scroll');
							
							// Detatch the PRE element from the DOM.
							$notes.detach();
							
							// Trigger the selection now that we've done our animation.
							_private.selectrange.apply($textarea,[values.notes.length||0,values.notes.length||0]);
							
						});
						
					} else {
						// Detatch the PRE element from the DOM.
						$notes.detach();
						
						// Trigger the text selection
						_private.selectrange.apply($textarea,[values.notes.length||0,values.notes.length||0]);
					}
					
					
					// Add the blur handler which will set the value when done.
					$textarea.blur(function(){
						
						// Store if we've changed the notes or not.
						var hasChanged	= values.notes != $(this).val(),
							$events		= values.elems;
						
						// Get the new value, and re-apply it to the event.
						values.notes = $(this).val();
						
						// Add the tittle.
						$events.attr('title',values.notes||'')
						
						if( $event.height() <= 30 ){
							$(this).css('overflow', 'hidden');
							$(this).animate({ height: noteHeight, opacity: 0 },125,data.settings.easing.eventeditout,function(){
								$(this).remove();
							});
						} else {
							$(this).remove();
						}
						
						// Add the original notes back in.
						$events.append($notes.text(values.notes||''));
						$event.bind('dblclick.'+plugin_name,_private.event.edit);
						
						// Only bother with the callback if the notes have actually changed.
						if( hasChanged ){
							// Store the new value against the object.
							$events.data(plugin_name,values);
							data.cache.events[values.uid] = values;
							values.calendar.data(plugin_name,data);
							
							// Run the user function with the new notes.
							data.settings.eventnotesedit.apply(values.calendar,[values.uid,values,$events]);
						};
					});
				}
				
				// Prevent default if we were given an event.
				if( e ){
					e.preventDefault();
					e.stopPropagation();
				}
			},
			
			/**
			 * Triggered when an appointment is clicked for selection, or manually selected via the.
			 * 
			 * @param mixed speed	: (opt) If int is number of milleseconds for animation, or string 'fast', 'slow'. If undefined, defaults to fast.
			 * @param string ease	: (opt) The easing method to use. See jQuery easing documentation for details.
			 *
			 * @return void
			 */
			select : function( speed, ease ){
									
				var $event	= $(this),
					values	= $event.data(plugin_name),
					data	= values && values.calendar ? values.calendar.data(plugin_name) : false ;
				
				if( data && values ){
					
					// Exit now if we don't allow selection.
					if( !data.settings.allowselect ) return;
					
					// Set the default speed if its not already defined.
					if( speed === undefined ) speed = 'fast';
					
					// Get the previously seleted element.
					var $old		= values.calendar.find('div.ui-'+plugin_name+'-event.selected'),
						oldvalues	= $old.data(plugin_name);
					
					// Were trying to select the same element.
					if( oldvalues && ( oldvalues.uid === values.uid ) ) return;
					
					// Run the on select handler, if the user has defined one for this instance.
					var veto = data.settings.eventselect.apply(values.calendar,[values.uid,values,$event]);
					
					// Check whether the eventselect handler overrode the selection.
					if( veto === undefined || veto ){
						
						// Get each of the elements for this event.
						var $events = values.elems;
						
						// Remove the currently selected appointment.
						// Add the selected class to the appointment.
						$old.removeClass('selected');
						$events.addClass('selected');
						
						// The position method will also apply any color changes.
						_private.draw[data.type].position.apply($events,[speed, ease]);
						_private.draw[data.type].position.apply($old,[speed, ease]);
					}
				}
			},
			
			/**
			 * Removes an event from the internal data array, and clears it off the calendar layout.
			 *
			 * @param object e		: An object representing the event that triggered this method.
			 * @param mixed speed	: (opt) If int is number of milleseconds for animation, or string 'fast', 'slow'. If undefined, defaults to fast.
			 * @param string ease	: (opt) The easing method to use. See jQuery easing documentation for details.
			 * 
			 * @return void
			 */
			remove : function( e, speed, ease ){
				
				// This method can be called from an event handler OR direct invocation. Get the correct
				// element depending on the calling method.
				var $event		= e ? $(this).parent('div.ui-'+plugin_name+'-event') : $(this),
					values		= $event.data(plugin_name),
					data		= values && values.calendar ? values.calendar.data(plugin_name) : false ;
				
				// Make sure we've got valid data and values for the calendar.
				if( data && values ){
					
					// Set the default speed if its not already defined.
					if( speed === undefined ) speed = 'fast';
					if( !ease ) ease = data.settings.easing.eventremove;
					
					// Get the events, check for a user veto, and define the animation end handler.
					var $events 	= values.elems,
						veto		= data.settings.eventremove.apply(values.calendar,[values.uid,values,$events,e]),
						removeEvent	= function(){
							// Remove the event from the DOM.
							// This method also cleans up all data assigned to this event.
							$(this).remove();
						};
					
					// Check whether the eventremove handler overrode the deletion.
					if( veto === undefined || veto ){
						// Animate the elements removal.
						
						// Set the base animation properties.
						var animation = {
							width		: 0,
							height		: 0,
							fontSize	: '0em',
							opacity		: .1
						};
						
						// Assume that the events will be removed, and remove
						// them from the calendars event cache.
						delete data.cache.events[values.uid];
						values.calendar.data(plugin_name,data);
						
						// Animate slightly differently depending on the
						// number of elements that we're displaying.
						switch( $events.length ){
							
							// Animating just the one element.
							case 1 :
								
								// Set the animation properties.
								animation.left	= '+='+( $event.width()/2 );
								animation.top	= '+='+( $event.height()/2 );
								
								// Run the animation.
								$event.animate( animation, speed, ease, removeEvent );
								
							break;
							
							// Animating two elements
							case 2 :
								
								// Get animation details first.
								var $e1		= $events.eq(0),
									$e2		= $events.eq(1),
									anim1	= $.extend({},animation),
									anim2	= $.extend({},animation);
								
								// Set the animation properties.
								anim1.left	= '+='+( $events.eq(0).width() );
								anim1.top	= data.cache.dayHeight;
								anim2.top	= 0;
								
								// Run the animations. Delay the first animation to give time
								// for the second one to start (so they animate at the same time).
								// TODO: This might be different for other browsers, in which case
								// 		 we might just need to ignore the difference in animation time??
								$e1.delay(375).animate( anim1, speed, ease, removeEvent );
								$e2.animate( anim2, speed, ease, removeEvent );
								
							break;
							
							// Animating three or more elements.
							default :
								
								var eventLeft = 0;
								
								// Find the left position to animate to.
								$events.each(function(){ eventLeft += $(this).width(); });
								
								// Set the absolute left position (no relative positions for the multiple days.
								animation.left	= $event.position().left + data.elements.container.scrollLeft() + ( eventLeft/2 );
								animation.top	= data.cache.dayHeight / 2;
								
								// Animate each of the events.
								// Again, the first animation seems to happen before the rest...
								// this delay hack ensures they all run together...
								// TODO: This might be different for other browsers, in which case
								// 		 we might just need to ignore the difference in animation time??
								$events.first().delay(375).animate( animation, speed, ease, removeEvent );
								$events.filter(':not(:first)').animate( animation, speed, ease, removeEvent );
								
							break;
						}
					}
				}
				
				// Prevent default if we were given an event.
				if( e ){
					e.preventDefault();
					e.stopPropagation();
				}
			}
		},
		
		// Drag event handlers.
		drag : {
			
			/**
			 * Called on mouse down for a drag object. Adds mouse move and mouse up events for drag operation.
			 *
			 * @param object e		: An object representing the event that triggered this method.
			 *
			 * @return void
			 */
			start : function( e ){
				// Drag start...
				
				var $target		= $(this),
					$event	= e && !$target.is('div.ui-'+plugin_name+'-event') ? $target.parents('div.ui-'+plugin_name+'-event') : $target,
					operation	= null,
					values		= $event.data(plugin_name),
					data		= values && values.calendar ? values.calendar.data(plugin_name) : false ;
				
				if( data && values ){
					
					// Store the $event and the data objects. These could change while
					// we're dragging, but to avoid causing issues with the user, we ignore
					// any changes until the beginning of of the next drag operation.
					// Because the values data is expected to change as a result of dragging, 
					// we need to load it each time in the mousemove handler.
					var eData = { 'event' : $event, 'data' : data, 'values' : values, i : 'cal_'+(new Date()).getTime(), 'type' : 'resize' };
					
					// Store the current drag details against this object. We clean them up after.
					_private.drag[eData.i] = {
						started	: false,								// Has dragging officially started??
						startX	: e.pageX,								// Start position of the element.
						startY	: e.pageY,								// 
						lastX	: e.pageX,								// Last recorded position of the element.
						lastY	: e.pageY,								//
						deltaX	: 0,									// Mouse movement in px since last recorded position.
						deltaY	: 0,									//
						incX	: 0,									// Increment movement (based on dragincrement setting) since last position.
						incY	: 0,									//
						obTime	: values.begins.copy(),					// Original begins time (stored in case we need to roll back).
						oeTime	: values.ends.copy(),					// Original end time (stored in case we need to roll back).
						bTime	: values.begins.roundToIncrement( data.settings.dragincrement ),		// When dragging, we round the begins and
						eTime	: values.ends.roundToIncrement( data.settings.dragincrement ),			// ends time to the drag increment.
					}
					
					// Stop animating, and snap to the end of the animation.
					$event.stop(true,true);
					
					// Choose the interaction based on criteria in each case.
					switch( true ){
						
						// Dragging.
						case $target.is('.ui-'+plugin_name+'-event') :
							
							// Set up comparisons for begins and ends dates.
							eData.lockBegins	= Number(data.settings.startdate.format("Ymd"));
							eData.lockEnds		= Number(data.cache.enddate.format("Ymd"));
							eData.lockDayBegins	= Number(data.settings.daytimestart.replace(/[^0-9]/g,''));
							eData.lockDayEnds	= Number(data.settings.daytimeend.replace(/[^0-9]/g,''));
							eData.type			= 'move';
							
							// Bind mousemove event to the document.
							$(document).bind('mousemove.'+plugin_name, eData,_private.drag.move)
							
						break;
						
						// Resizing up
						case $target.is('.resize-top') :
							
							// Lock the date to the current date for this drag.
							eData.lockDate = values.begins.format('Y-m-d');
							
							// Bind mousemove event to the document.
							$(document).bind('mousemove.'+plugin_name, eData,_private.drag.resizeB);
							
						break;
						
						// Resizing down…
						case $target.is('.resize-bottom') :
							
							// Lock the date to the current date for this drag.
							eData.lockDate = values.ends.format('Y-m-d');
							
							// Bind mousemove event to the document.
							$(document).bind('mousemove.'+plugin_name, eData,_private.drag.resizeE);
							
						break;
						
						// If none of the other cases work, remove the current drag details.
						default: delete _private.drag[eData.i]; return true;
					}
					
					// Also, bind the drag end event for each case.
					$(document).bind('mouseup.'+plugin_name, eData, _private.drag.end);
					
					// Stop the mousedown event from propagating to elements under it. 
					e.stopPropagation();
				}
			},
			
			/**
			 * Called on mousemove for a resize-top drag object.
			 *
			 * @param object e		: An object representing the event that triggered this method.
			 *
			 * @return void
			 */
			resizeB : function( e ){
				// Resize the 'begins' time.

				var $event	= e.data.event,
					data	= e.data.data,
					values	= e.data.values,
					drag	= _private.drag[e.data.i];
				
				// Calculate the new delta.
				drag.deltaY=drag.lastY-e.pageY;drag.lastY=e.pageY;drag.incY+=drag.deltaY;
												
				// Exit now if there is no Y delta change to save processing time.
				if( drag.deltaY == 0 ) return true;
				
				// Don't officially start the drag operation until 5 pixels in.
				if( !drag.started && ( drag.incY > 5 || drag.incY < -5 ) ){
					
					// Start your engines!!
					drag.started = true;
					
					// Add the dragging class to the event.
					$event.addClass('ui-dragging ui-resizing');
					
				} else if( drag.started ){
					
					// Calculate the drag movement in drag increment.
					var incrementMovement = Math.round( drag.incY / data.cache.dragHeight );
					
					// Check the increment. Don't go any further if there isn't one.
					if( incrementMovement === 0 ) return true;
					
					// get the increment.
					var testTime = drag.bTime.incrementBy( data.settings.dragincrement, 0-incrementMovement );
					var td = testTime.format('Y-m-d');
					var tt = testTime.format('H:i:s');
					
					// If we've still got a valid date.
					if( td === e.data.lockDate || tt !== data.settings.daytimestart ){
						
						if( td !== e.data.lockDate ){
							// Work out what the new time is.
							testTime = $[plugin_name].date( e.data.lockDate+' '+data.settings.daytimestart );
														
							// work out how what the increment is between this and the day start time.
							incrementMovement = Math.round( testTime.getIncrementBetween( values.begins, data.settings.dragincrement ) );
							
						}
						
						if( testTime >= values.ends ){
							// If the new time is less than or equal to the current time, calculate the difference between the end and beginning time.
							incrementMovement = Math.round( values.ends.getIncrementBetween( values.begins, data.settings.dragincrement ) );
							
							// Then set the new beginning time (1 increment's difference than the other time in the direction that we're dragging).
							testTime = values.ends.incrementBy( data.settings.dragincrement, -1 ).copy();
							
							// Now, we unbind this handler, and bind the bottom resize handler. 
							$(document).unbind('mousemove.'+plugin_name).bind('mousemove.'+plugin_name,e.data,_private.drag.resizeE);
						}
						
						// We've incremented our date, so remove this from the increment counter.
						drag.incY -= (incrementMovement*data.cache.dragHeight);
							
						// Set the new values to the testTime.
						values.begins = drag.bTime = testTime;
						values.cache.begins = ( data.settings.startdate > values.begins ? data.settings.startdate.copy() : values.begins );
						
						// Store the new event time to the element.
						$event.data(plugin_name,values);
						data.cache.events[values.uid] = values;
						values.calendar.data(plugin_name,data);
						
						// Now, just position the event. DONT animate while dragging.
						_private.draw[data.type].position.apply(values.elems);
					}
				}
			},
			
			/**
			 * Called on mousemove for a resize-bottom drag object.
			 *
			 * @param object e		: An object representing the event that triggered this method.
			 *
			 * @return void
			 */
			resizeE : function( e ){
				// Resize the ends time.

				var $event	= e.data.event,
					data	= e.data.data,
					values	= e.data.values,
					drag	= _private.drag[e.data.i];
				
				// Calculate the new delta.
				drag.deltaY=drag.lastY-e.pageY;drag.lastY=e.pageY;drag.incY+=drag.deltaY;
												
				// Exit now if there is no Y delta change to save processing time.
				if( drag.deltaY == 0 ) return true;
				
				// Don't officially start the drag operation until 5 pixels in.
				if( !drag.started && ( drag.incY > 5 || drag.incY < -5 ) ){
					
					// Start your engines!!
					drag.started = true;
					
					// Add the dragging class to the event.
					$event.addClass('ui-dragging ui-resizing');
					
				} else if( drag.started ){
					
					// Calculate the drag movement in drag increment.
					var incrementMovement = Math.round( drag.incY / data.cache.dragHeight );
					
					// Check the increment. Don't go any further if there isn't one.
					if( incrementMovement === 0 ) return true;
					
					// get the increment.
					var testTime = drag.eTime.incrementBy( data.settings.dragincrement, 0-incrementMovement );
					var td = testTime.format('Y-m-d');
					var tt = testTime.format('H:i:s');
					
					// If we've still got a valid date.
					if( td === e.data.lockDate || tt !== data.settings.daytimeend ){
						
						if( td !== e.data.lockDate ){
							// Work out what the new time is.
							testTime = $[plugin_name].date( e.data.lockDate+' '+data.settings.daytimeend );
														
							// work out how what the increment is between this and the day start time.
							incrementMovement = Math.round( testTime.getIncrementBetween( values.ends, data.settings.dragincrement ) );
						}
						
						if( testTime <= values.begins ){
							// If the new time is less than or equal to the current time, calculate the difference between the end and beginning time.
							incrementMovement = Math.round( values.begins.getIncrementBetween( values.ends, data.settings.dragincrement ) );
							
							// Then set the new beginning time (1 increment's difference than the other time in the direction that we're dragging).
							testTime = values.begins.incrementBy( data.settings.dragincrement, 1 ).copy();
							
							// Now, we unbind this handler, and bind the bottom resize handler. 
							$(document).unbind('mousemove.'+plugin_name).bind('mousemove.'+plugin_name,e.data,_private.drag.resizeB);
						}
						
						// We've incremented our date, so remove this from the increment counter.
						drag.incY -= (incrementMovement*data.cache.dragHeight);
							
						// Set the new values to the testTime.
						values.ends = drag.eTime = testTime;
						values.cache.ends = ( data.cache.enddate < testTime ? data.cache.enddate.addSeconds(-1) : testTime );
						
						// Store the new event time to the element.
						$event.data(plugin_name,values);
						data.cache.events[values.uid] = values;
						values.calendar.data(plugin_name,data);
						
						// Now, just position the event. DONT animate while dragging.
						_private.draw[data.type].position.apply(values.elems);
					}
				}
			},
			
			/**
			 * Called on mousemove for an event body drag object.
			 *
			 * @param object e		: An object representing the event that triggered this method.
			 *
			 * @return void
			 */
			move : function( e ){
				// Drag to move the appointment (start and end timestamp).
				
				var $event	= e.data.event,
					data	= e.data.data,
					values	= e.data.values,					
					drag	= _private.drag[e.data.i];
				
				// Calculate the new delta.
				drag.deltaX=drag.lastX-e.pageX;drag.lastX=e.pageX;drag.incX+=drag.deltaX;
				drag.deltaY=drag.lastY-e.pageY;drag.lastY=e.pageY;drag.incY+=drag.deltaY;
				
				// Don't officially start the drag operation until 5 pixels in.
				if( !drag.started && ( drag.incY > 5 || drag.incY < -5 || drag.incX > 5 || drag.incY < -5 ) ){
					
					// Start your engines!!
					drag.started = true;
					
					// Add the dragging class to the event.
					$event.addClass('ui-dragging');
					
				} else if( drag.started ){
					
					switch( data.type ){
						
						case const_week : 
							// Calculate the drag movement in drag increment.
							var incrementMovement	= Math.round( drag.incY / data.cache.dragHeight );
							var dayMovement			= Math.round( drag.incX / data.cache.dayWidth );
							
							// Check the movement. Don't go any further if there isn't any.
							if( incrementMovement === 0 && dayMovement === 0 ) return true;
							
							// Increment by the day.
							var testTimeB	= drag.bTime.addDays( 0-dayMovement ).incrementBy( data.settings.dragincrement, 0-incrementMovement );
							var testTimeE	= drag.eTime.addDays( 0-dayMovement ).incrementBy( data.settings.dragincrement, 0-incrementMovement );
							
							// We've incremented our date, so remove this from the increment counter.
							drag.incY -= (incrementMovement*data.cache.dragHeight);
							drag.incX -= (dayMovement*data.cache.dayWidth);
							
							values.begins	= drag.bTime = testTimeB;
							values.ends		= drag.eTime = testTimeE;
							values.cache.ends = ( data.cache.enddate < testTimeE ? data.cache.enddate.addSeconds(-1) : testTimeE );
							values.cache.begins = ( data.settings.startdate > values.begins ? data.settings.startdate.copy() : values.begins );
							
							// Store the new event time to the element.
							$event.data(plugin_name,values);
							data.cache.events[values.uid] = values;
							values.calendar.data(plugin_name,data);
							
							// Now, just position the event. DONT animate while dragging.
							_private.draw[data.type].position.apply(values.elems);
						break;
						
						case const_month :
							$event.css({ left : '-='+drag.deltaX, top : '-='+drag.deltaY });
						break;
					}
				}
			},
			
			/**
			 * Called on mousemove for a resize-bottom drag object.
			 *
			 * @param object e		: An object representing the event that triggered this method.
			 *
			 * @return void
			 */
			end : function( e ){
				// Drag end...
				
				var $event	= e.data.event,
					data	= e.data.data,
					values	= e.data.values;
				
				switch( e.data.type ){
					case 'resize'	: data.settings.eventresize.apply(values.calendar,[values.uid,values,$event]); break;
					case 'move'		: data.settings.eventmove.apply(values.calendar,[values.uid,values,$event]); break;
				}
				
				// Clean up the events we attached to the document.
				$(document)
					.unbind('mousemove.'+plugin_name)
					.unbind('mouseup.'+plugin_name);
				
				// Remove the dragging class.
				$event.removeClass('ui-dragging ui-resizing');
				
				// Clean up the temporary drag storage object.
				delete _private.drag[e.data.i];
				
				// Redraw one last time.
				_private.draw[data.type].position.apply(values.elems);
			}
		},
		
		// Methods to draw the different styles of appointment.
		draw : {
			
			// Draw week style calendar / event
			week : {
				
				/**
				 * Draw the calendar to the screen as a week view.
				 *
				 * @param object data	: The calendar data object which describes how to draw the calendar.
				 *
				 * @return void; 
				 */
				cal : function( data ){
				
					// Initialise variables for the loops below.
					var clonedTime,
						clonedDate,
						clonedTimeObject,
						clonedDateObject,
						clonedResourceLabel,
						clonedTimeLabel,
						clonedDateLabel,
						clonedDateFormat,
						todayDate = $[plugin_name].date().format('Y-m-d');
					
					// Apply the CSS to the master element.
					// This will automatically get cloned with the element.
					data.elements.timeblock.css({
						width	: '100%',
						height	: data.cache.incrementHeight
					});
					
					data.elements.timelabel.css({
						width	: '100%',
						height	: data.cache.incrementHeight
					});
					
					// Loop through each increment to create a standard day fragment we can
					// clone for each of the days we want to display.
					for( var i=0, mPast, mTime; i<data.cache.incrementsInDay; i++ ){
						
						// Clone the time object, and increment by whatever the loop counter is.
						clonedTimeObject = data.settings.startdate.incrementBy( data.settings.gridincrement, i )
						mTime = clonedTimeObject.format( 'H:i:s' );
						mPast = clonedTimeObject.format( 'i' );
						
						// Clone the time, and store the start time it represents in an attribute. 
						clonedTime = data.elements.timeblock.clone(true);
						clonedTime.attr( 'time', mTime );
						clonedTime.attr( 'past', mPast );
						
						// Clone the time label, and store the time it represents as an attribute.
						clonedTimeLabel = data.elements.timelabel.clone(true);
						clonedTimeLabel.attr( 'time', mTime );
						clonedTimeLabel.attr( 'past', mPast );
						
						// Choose the format type, depending on what's been defined.
						if( mTime == '12:00:00' && 'noon' in data.settings.masktimelabel ){
							clonedTimeLabel.find('p:first').html( clonedTimeObject.format( data.settings.masktimelabel['noon'] ) );
						} else if( mPast in data.settings.masktimelabel ){
							clonedTimeLabel.find('p:first').html( clonedTimeObject.format( data.settings.masktimelabel[mPast] ) );
						}
						
						// Append the cloned time element into the dayblock.
						data.elements.dayblock.append( clonedTime );
						data.elements.timeline.append( clonedTimeLabel );
					}
					
					// Get the first timeblock element, and remove the border from the top.
					data.elements.dayblock.find('div.ui-'+plugin_name+'-time:first').css('border-top','0')
					data.elements.timeline.find('div.ui-'+plugin_name+'-label-time:first').html('');
					
					// Apply the CSS to the master element.
					// This will automatically get cloned with the element.
					data.elements.dayblock.css({
						width	: data.cache.resourceWidth,
						height	: data.cache.dayHeight
					});
					
					data.elements.resourcelabel.css({
						width	: data.cache.resourceWidth,
						height	: '100%'
					})
					
					data.elements.datelabel.css({
						width	: data.cache.dayWidth,
						height	: '100%'
					});
					
					// Loop through each day, and append the dayblocks into the container.
					for( var i=0; i<data.settings.daystodisplay; i++ ){
						
						// Clone the time object, and increment by whatever the loop counter is.
						clonedDateObject = data.settings.startdate.addDays(i);
						clonedDateFormat = clonedDateObject.format('Y-m-d');
						
						for( var r=0; r<data.cache.resourcecount; r++ ){
						
							// Clone the day element, and store the date it represents in an attribute.
							clonedDate = data.elements.dayblock.clone(true)
								.css( 'left', ( data.cache.dayWidth * i ) + ( data.cache.resourceWidth * r ) )
								.attr({
									'date'		: clonedDateFormat,
									'day'		: clonedDateObject.getDay(),
									'resource'	: _private.resource.apply(this,[r,data]).id
								});
							
							if( r<(data.cache.resourcecount-1) ) clonedDate.addClass('ui-'+plugin_name+'-resource');
							if( clonedDateFormat === todayDate ) clonedDate.addClass('ui-'+plugin_name+'-today')
							
							// Append the cloned dayblock into the container.
							data.elements.container.append( clonedDate );
							
							if( data.settings.resources ){
								clonedResourceLabel = data.elements.resourcelabel.clone(true)
									.css( 'left', ( data.cache.dayWidth * i ) + ( data.cache.resourceWidth * r ) )
									.attr({
										'date'		: clonedDateFormat,
										'day'		: clonedDateObject.getDay(),
										'resource'	: _private.resource.apply(this,[r,data]).id
									})
									.find('p')
										.html( _private.resource.apply(this,[r,data]).name )
									.end();
								
								data.elements.resourceline.append( clonedResourceLabel );
							}
						}
						
						// Clone the date label, and store the date it represents as an attribute.
						clonedDateLabel = data.elements.datelabel.clone(true)
							.css( 'left', data.cache.dayWidth * i )
							.attr({
								'date'	: clonedDateFormat,
								'day'	: clonedDateObject.getDay(),
							})
							.find('p')
								.html( clonedDateObject.format( data.settings.maskdatelabel ) )
							.end();
						
						if( clonedDateFormat === todayDate ) clonedDateLabel.addClass('ui-'+plugin_name+'-today');
						
						// Append the cloned daylabel into the container.
						data.elements.dateline.append( clonedDateLabel );
						
					}
					
					// Make an allocation for the scrollbars.
					data.elements.dateline.add(data.elements.resourceline).css({right:data.cache.scrollbarSize});
					
					// Get $this...
					var $this = $(this);
					
					$this // Construct the base HTML in this element.
						.append( data.elements.timeline )
						.append( data.elements.dateline )
						.append( data.elements.datelinefill )
						.append( data.elements.container );
					
					// If the user has defined resources, set those.
					if( $.isArray( data.settings.resources ) || typeof data.settings.resources == 'object' ){
						
						$this // Append these elements to the DOM.
							.append( data.elements.resourceline )
							.append( data.elements.resourcelinefill );
					}
					
					// For the purposes of this demo, we've also included a little bit of code to scroll
					// the calendar so noon displays in the middle of the page.
					var scrollPos = (data.cache.dayHeight/2) - (data.elements.container.height()/2) ;
					data.elements.container.scrollTop(scrollPos);
				},
				
				/**
				 * Draw the event to the screen as a week display.
				 *
				 */
				event : function( data, values )
				{
					// Cache the dates (make sure for internal purposes it doesn't extend after the last displaying date.
					values.cache.ends = ( data.cache.enddate < values.ends ? data.cache.enddate.addSeconds(-1) : values.ends );
					values.cache.begins = ( data.settings.startdate > values.begins ? data.settings.startdate.copy() : values.begins );
					
					// Calculate the number of elements required to render this event.
					// This would usually be one event per day * the number of resources this event is applied to.
					var daysInEvent = _private.event.calculateElementCount.apply(this, [values]),
						$event, $events;
					
					// Check if we've create event fragments.
					if( !( 'elems' in values ) || values.elems.length < 1 ){
						
						// Store the event values against the element.
						// If everything is in order, create the event data.
						$event = fragments.event.clone(true);
						
						// Hide certain elements if some interactions aren't allowed.
						if( !data.settings.allowremove ) $event.find('span.button-remove').hide();
						if( !data.settings.allowresize ) $event.find('p.resize-top, p.resize-bottom').hide();
						if( data.settings.allowmove ){
							$event.find('pre.details').bind('selectstart.'+plugin_name,_private.prevent);
						} else {
							$event.unbind('mousedown.'+plugin_name,_private.drag.start);
						}
						
						// Add the text straight to the event details.
						$event.attr('data-id',values.uid);
						$event.find('pre.details').text( values.notes );
						$event.find('p.title').text( values.title || ( values.begins.format(data.settings.maskeventlabel) + 
								(
									data.settings.maskeventlabelend !== '' ? data.settings.maskeventlabeldelimiter + values.ends.format( data.settings.maskeventlabelend ) : ''
								)
							)
						 );
						
						
						// Start the events collection small with this element.
						$events = $event;
						
					} else {
						
						// Get the first element, and restore default classes.
						// Start the events collection with all the elements we've got.
						$events = values.elems.detach();
						
						// Whittle the events collection down to the elements we need.
						if( $events.length > daysInEvent ) $events.slice( 0, daysInEvent );
						
						// Reset the classes on the existing events, and get the first one to continue cloning if needed.
						$event = $events.removeClass('begin end').addClass('mid').eq(0);
					}
					
									
					// Loop to create the number of elements required to render this event.
					while( daysInEvent > $events.length ) $events = $events.add($event.clone(true));
					
					// Set the classes for begin and end.
					if( data.settings.startdate <= values.begins )	$events.first().removeClass('mid').addClass('begin');
					if( data.cache.enddate >= values.ends )			$events.last().removeClass('mid').addClass('end');
					
					// Only add the event to the data array, and to the DOM,
					// if it falls within the date range.
					data.elements.container.append($events);
					
					// Store the $events elements in the event data object.
					values.elems = $events;
					$events.data(plugin_name,values);
					
					// Run the positioning code.
					_private.draw[data.type].position.apply($events);
				},
				
				/**
				 * Positions an event object on the screen according to its data object.
				 *
				 * @param int speed		: (opt) The speed of animation in milliseconds. If ommited, we won't animate the changes.
				 * @param string ease	: (opt) The easing method to use. See jQuery easing documentation for details.
				 *
				 * @return void
				 */
				position : function( speed, ease, detect ){
					/* Position an event element on the screen */
					
					var $events	= $(this),
						values	= $events.data(plugin_name),
						data	= values && values.calendar ? values.calendar.data(plugin_name) : false,
						detect	= detect === undefined ? true : detect ;
					
					// Make sure we've got values.
					if( data && values ){
						
						// Loop over each of the event elements and draw them.
						$events.each(function( i, event ){
							
							var $event		= $(event),
								dayBegins	= $[plugin_name].date( values.begins.addDays(i), data.settings.daytimestart ),
								dayEnds		= $[plugin_name].date( values.begins.addDays(i), data.settings.daytimeend );
							
							// Prevent detection of overlaps if we've passed through
							// the detect flag.
							if( detect ){
								
								// Check if we were overlapping items previously.
								var wasOverlapping = values.overlap.items;
								
								// Get the event overlaps for this day.
								_private.overlaps.apply(values.calendar,[dayBegins,dayEnds,values.resource]);
								
								// Make sure we've got any update event values. In particular, the overlap data.
								values = $event.data(plugin_name);
															
								// Redraw any items that this event is overlapping.
								for( var uid in values.overlap.items ){
									_private.draw[data.type].position.apply( values.overlap.items[uid].elems, [false,false,false] );
								}
								
								// Redraw any items that we were previously overlapping.
								// Double check that we haven't already re-drawn this item.
								for( var uid in wasOverlapping ){
									if( !( uid in values.overlap.items ) ){
										_private.draw[data.type].position.apply( wasOverlapping[uid].elems, [false,false,true] );
									}
								}
							}
							
							// Calculate the new CSS.
							var newStylesMain = {
								top				: i>0 ? 0 : data.cache.incrementHeight * $[plugin_name].date( values.cache.begins, data.settings.daytimestart ).getIncrementBetween( values.cache.begins, data.settings.gridincrement ),
								left			: data.cache.dayWidth * ( data.settings.startdate.getDaysBetween( values.cache.begins, true ) + i ) + ( data.cache.resourceWidth * values.resource ),
								width			: ( values.resource !== null ? data.cache.resourceWidth : data.cache.dayWidth ) - 1,
								height			: Math.min( data.cache.dayHeight, data.cache.incrementHeight * ( i<1 ? values.begins : dayBegins ).getIncrementBetween( ( i==$events.length-1 ? values.cache.ends : dayEnds ), data.settings.gridincrement ) ),
								backgroundColor : $event.hasClass('selected') ? values.colors.mainSelected : values.colors.mainBackground,
								textShadow		: values.colors.mainTextShadow+' 1px 1px 1px',
								color			: values.colors.mainText
							}
							
							newStylesMain.width -= data.settings.overlapoffset*values.overlap.count;
							newStylesMain.left  += data.settings.overlapoffset*values.overlap.inset;
							
							var newStylesDetails = {
								backgroundColor	: values.colors.detailsBackground,
								textShadow		: values.colors.detailsTextShadow+' 1px 1px 1px',
								color			: values.colors.detailsText
							}
							
							// If the event display is too small to show any meaningful details area
							// Use the title attribute instead.
							if( newStylesMain.height <= 15 ){
								newStylesDetails.display = 'none';
								$event.attr('title',values.notes||'').unbind('dblclick.'+plugin_name).bind('dblclick.'+plugin_name,_private.event.edit);
							} else {
								
								newStylesDetails.display = 'block';
								$event.removeAttr('title').unbind('dblclick.'+plugin_name);
							}
							
							// Set the appointment time while dragging.
							if( !values.title ) $event.find('p.title').text( values.begins.format(data.settings.maskeventlabel) + ( data.settings.maskeventlabelend !== '' ? data.settings.maskeventlabeldelimiter + values.ends.format( data.settings.maskeventlabelend ) : '' ) );
							
							// Choose whether to animate or not.
							if( !speed ){
								$event.css(newStylesMain);
								$event.find('pre.details').css(newStylesDetails);
							} else {
								// Animate the event.
								$event
									.stop(true, false)
									.animate(newStylesMain, speed, ease || data.settings.easing.eventupdate)
									.find('pre.details')
										.stop(true, false)
										.animate(newStylesDetails, speed, ease || data.settings.easing.eventupdate)
										.css('display',newStylesDetails.display);
		
								// If jQuery UI isn't loaded, we need to
								// manually set the colours, as they won't animate.
								if( jQuery.ui === undefined ){
									$event.css({
										backgroundColor : newStylesMain.backgroundColor,
										textShadow		: newStylesMain.textShadow,
										color			: newStylesMain.color
									});
									$event.find('pre.details').css({
										backgroundColor : newStylesDetails.backgroundColor,
										textShadow		: newStylesDetails.textShadow,
										color			: newStylesDetails.color
									});
								}
							}
						});
					}
				}
			},
			
			// Draw month style calendar / event
			month : {
				
				/**
				 * Draw the calendar to the screen as a month view.
				 *
				 * @param object data	: The calendar data object which describes how to draw the calendar.
				 *
				 * @return void; 
				 */
				cal : function( data ){
					
					var clonedMonth,
						clonedDate,
						clonedDateLabel,
						clonedDateObject,
						clonedDateFormat,
						todayDate = $[plugin_name].date().format('Y-m-d');
						
					data.elements.datelabel.css({
						width	: data.cache.dayWidth,
						height	: '100%'
					});
					
					data.elements.dayblock.css({
						width	: data.cache.dayWidth,
						height	: data.cache.dayHeight
					});
					
					for( var i=0; i<data.settings.daystodraw; i++ ){
					
						// Clone the time object, and increment by whatever the loop counter is.
						clonedDateObject = data.settings.startdate.addDays(i);
						clonedDateFormat = clonedDateObject.format('Y-m-d');
						
						// Clone the day element, and store the date it represents in an attribute.
						clonedDate = data.elements.dayblock.clone(true)
							.attr({
								'date'	: clonedDateFormat,
								'day'	: clonedDateObject.getDay()
							})
							.css({
								'left'	: data.cache.dayWidth * (i%7),
								'top'	: data.cache.dayHeight * Math.floor(i/7)
							})
							.toggleClass( 'non-month', clonedDateObject.getMonth()+1 != data.settings.startmonth )
							.find('p')
								.text( clonedDateObject.getDate() )
							.end();
						
						if( clonedDateFormat === todayDate ) clonedDate.addClass('ui-'+plugin_name+'-today');
						
						// Only create labels for the first seven (number of days in week).
						if( i<7 ){
							// Clone the date label, and store the date it represents as an attribute.
							clonedDateLabel = data.elements.datelabel.clone(true)
								.attr({
									'date'	: clonedDateFormat,
									'day'	: clonedDateObject.getDay() 
								})
								.css( 'left', data.cache.dayWidth * i )
								.find('p')
									.html( clonedDateObject.format( data.settings.maskmonthlabel ) )
								.end();
							
							data.elements.dateline.append( clonedDateLabel );
						}
						
						// Append the cloned dayblock into the container.
						data.elements.container.append( clonedDate );
					}
					
					var $this = $(this);
					
					$this // Construct the base HTML in this element.
						.append( data.elements.dateline )
						.append( data.elements.container );
				},
				
				/**
				 * Draw the event to the screen as a week display.
				 *
				 */
				event : function( data, values )
				{
					// Cache the dates (make sure for internal purposes it doesn't extend after the last displaying date.
					values.cache.ends = ( data.cache.enddate < values.ends ? data.cache.enddate.addSeconds(-1) : values.ends );
					values.cache.begins = ( data.settings.startdate > values.begins ? data.settings.startdate.copy() : values.begins );
					
					// Calculate the number of elements required to render this event.
					// This would usually be one event per day * the number of resources this event is applied to.
					var daysInEvent = _private.event.calculateElementCount.apply(this, [values]),
						$event, $events;
					
					// Check if we've create event fragments.
					if( !( 'elems' in values ) || values.elems.length < 1 ){
						
						// Store the event values against the element.
						// If everything is in order, create the event data.
						$event = fragments.event.clone(true);
						
						// Hide certain elements if some interactions aren't allowed.
						if( !data.settings.allowremove )	$event.find('span.button-remove').hide();
						if( !data.settings.allowmove )		$event.unbind('mousedown.'+plugin_name,_private.drag.start);
						
						// Add the text straight to the event details.
						$event.find('p.resize-top, p.resize-bottom').hide();
						$event.attr('data-id',values.uid);
						$event.find('pre.details').text( values.notes );
						$event.find('p.title').text( '● ' + ( values.title || ( values.begins.format(data.settings.maskeventlabel) + 
							(
								data.settings.maskeventlabelend !== '' ? data.settings.maskeventlabeldelimiter + values.ends.format( data.settings.maskeventlabelend ) : ''
							)
						) ) );
						$event.attr('title',values.notes||'').unbind('dblclick.'+plugin_name).bind('dblclick.'+plugin_name,_private.event.edit);
						
						// Start the events collection small with this element.
						$events = $event;
						
					} else {
						
						// Get the first element, and restore default classes.
						// Start the events collection with all the elements we've got.
						$events = values.elems.detach();
						
						// Whittle the events collection down to the elements we need.
						if( $events.length > daysInEvent ) $events.slice( 0, daysInEvent );
						
						// Reset the classes on the existing events, and get the first one to continue cloning if needed.
						$event = $events.removeClass('begin end').addClass('mid').eq(0);
					}
					
					// Loop to create the number of elements required to render this event.
					while( daysInEvent > $events.length ) $events = $events.add($event.clone(true));
					
					// Set the classes for begin and end.
					if( data.settings.startdate <= values.begins )	$events.first().removeClass('mid').addClass('begin');
					if( data.cache.enddate >= values.ends )			$events.last().removeClass('mid').addClass('end');
					
					// Only add the event to the data array, and to the DOM,
					// if it falls within the date range.
					data.elements.container.append($events);
					
					// Store the $events elements in the event data object.
					values.elems = $events;
					$events.data(plugin_name,values);
					
					// Run the positioning code.
					_private.draw[data.type].position.apply($events);
				},
						
				/**
				 * Positions an event object on the screen according to its data object.
				 *
				 * @param int speed		: (opt) The speed of animation in milliseconds. If ommited, we won't animate the changes.
				 * @param string ease	: (opt) The easing method to use. See jQuery easing documentation for details.
				 *
				 * @return void
				 */
				position : function( speed, ease, detect ){
					/* Position an event element on the screen */
					
					var $events	= $(this),
						values	= $events.data(plugin_name),
						data	= values && values.calendar ? values.calendar.data(plugin_name) : false,
						detect	= detect === undefined ? true : detect ;
					
					// Make sure we've got values.
					if( data && values ){
						
						// Loop over each of the event elements and draw them.
						$events.each(function( i, event ){
							
							var $event = $(event), selected = $event.hasClass('selected'), spanning = $events.length > 1;
							
							// Calculate the new CSS.
							var newStylesMain = {
								top				: data.cache.dayHeight * Math.floor((values.begins.addDays(i).getDate()-1)/7) + 2 + 18,
								left			: ( data.cache.dayWidth * ((values.begins.addDays(i).getDate()-1)%7) ) + ( i > 0 ? 0 : 2 ),
								width			: data.cache.dayWidth - ( spanning && i==0 ? 2 : 4 ),
								height			: data.cache.incrementHeight,
								backgroundColor : selected ? values.colors.mainSelected : 'transparent' ,
								textShadow		: selected ? values.colors.mainTextShadow+' 1px 1px 1px' : 'none' ,
								color			: selected ? values.colors.mainText : values.colors.mainBackground
							}
							
							// Re-set the notes attribute on this event.
							$event.attr('title',values.notes||'');
							
							if( selected ){
								if( event.style.removeAttribute ){
									event.style.removeAttribute('background-image');
								} else {
									event.style.removeProperty('background-image');
								}
								$event.find('span.button-remove').show();
								
								if( spanning && i==0 ){
									$event.find('span.button-remove').hide();
								}
								if( i > 0 ){
									$event.find('p.title').hide();
								}
								
							} else {
								event.style.backgroundImage = 'none';
								$event.find('span.button-remove').hide()
								if( i > 0 ){
									$event.find('p.title').show();
								}
							}
									
							// Choose whether to animate or not.
							if( !speed ){
								$event.css(newStylesMain).find('pre.details').hide();
							} else {
								// Animate the event.
								$event
									.stop(true, false)
									.animate(newStylesMain, speed, ease || data.settings.easing.eventupdate)
									.find('pre.details').hide();
		
								// If jQuery UI isn't loaded, we need to
								// manually set the colours, as they won't animate.
								if( jQuery.ui === undefined ){
									$event.css({
										backgroundColor : newStylesMain.backgroundColor,
										textShadow		: newStylesMain.textShadow,
										color			: newStylesMain.color
									});
								}
							}
						});
					}
				}
			}
		}
	};
	
	// Some of these fragments will be initialized once in the code
	// if they happen to be used with the current setup.
	// Others will be used in all setups, so are initialized now.
	var fragments = {
		
		// Create the event element and bind event handlers…
		// this will be cloned for each event we create.
		event : $([
			'<div class="ui-'+plugin_name+'-event mid">',
				'<p class="resize-top" />',
				'<p class="title" />',
				'<span class="button-remove" />',
				'<pre class="details" />',
				'<p class="footer" />',
				'<p class="resize-bottom" />',
			'</div>'
		].join(''))
			.bind('selectstart.'+plugin_name,_private.prevent)
			.bind('mousedown.'+plugin_name,_private.event.select)
			.bind('mousedown.'+plugin_name,_private.drag.start)
			.find('p.resize-top, p.resize-bottom').bind('mousedown.'+plugin_name,_private.drag.start).end()
			.find('pre.details').bind('dblclick.'+plugin_name,_private.event.edit).end()
			.find('p').bind('selectstart.'+plugin_name,_private.prevent).end()
			.find('span.button-remove').bind('click.'+plugin_name,_private.event.remove).end(),
			
		// Create layout elements.
		day					: $('<div class="ui-'+plugin_name+'-date" date="" day="" />').bind('selectstart.'+plugin_name,_private.prevent),
		time				: $('<div class="ui-'+plugin_name+'-time" time="" past="" />'),
		labels				: {
			time		: $('<div class="ui-'+plugin_name+'-label-time" time="" past="" ><p /></div>'),
			date		: $('<div class="ui-'+plugin_name+'-label-date" date=""><p /><div class="delimiter" /></div>'),
			resource	: $('<div class="ui-'+plugin_name+'-label-resource" date=""><p /><div class="delimiter" /></div>'),
		},
		timeline			: $('<div class="ui-'+plugin_name+'-timeline" />').bind('selectstart.'+plugin_name,_private.prevent),
		dateline			: $('<div class="ui-'+plugin_name+'-dateline" />').bind('selectstart.'+plugin_name,_private.prevent),
		datelinefill		: $('<div class="ui-'+plugin_name+'-dateline-fill" />'),
		resourceline		: $('<div class="ui-'+plugin_name+'-resourceline" />'),
		resourcelinefill	: $('<div class="ui-'+plugin_name+'-resourceline-fill" />'),	
		container			: $('<div class="ui-'+plugin_name+'-wrapper" />').bind('scroll.'+plugin_name,_private.onscroll)
	};
	
	// Publicly accessable methods.
	var methods = {
		
		/**
		 * Initialises the calendar. Responsible for drawing, and setting up events etc.
		 *
		 * @param object options	: An object of key -> value pairs that maps with the defaults object above.
		 *
		 * @return object			: Returns the jQuery collection that this plugin was called on.
		 * @scope public.
		 */
		init : function( options ){
			
			// Loop through each passed element.
			return $(this).each(function(){
				
				// Settings to the defaults.
				var settings = $.extend({},defaults);
				
				// If options exist, lets merge them
				// with our default settings.
				if( options ) $.extend( settings, options );
				
				// Create shortcuts, and get any existing data.
				var $this = $(this),data = $this.data(plugin_name);
				
				// If the plugin hasn't been initialized yet
				if ( ! data ) {
					
					// Create the data object.
					data = {
						
						type		: const_week,		// Defaults to week view.
						target		: $this,			// This element.
						settings	: settings,			// The settings for this plugin.
						
						// An object which contains all HTML elments related to the
						// presentation of the calendar itself (anything except events).
						elements	: {},
						
						// The cache is an object where we store internally calculated
						// values that are reused in other places, but aren't necessarily
						// that useful for implementors to access.
						cache		: {
							scrollbarSize	: _private.scrollbarSize(),
							enddate			: undefined,
							incrementsInDay : undefined,
							incrementHeight	: undefined,
							dragHeight		: undefined,
							dayWidth		: undefined,
							dayHeight		: undefined,
							events			: {},
							calendars		: {}
						}
					}
					
					if( // Check if this is a day or a month calendar.
						data.settings.startmonth === null &&
						data.settings.startyear === null &&
						data.settings.monthstodisplay === null
					){
						// This is a day calendar.
						
						if( data.settings.startdate === null )			data.settings.startdate = new Date();
						if( data.settings.daystodisplay === null )		data.settings.daystodisplay = 7;
												
					} else {
						// This is a month calendar.
						
						if( data.settings.startmonth === null )			data.settings.startmonth = (new Date()).getMonth()+1;
						if( data.settings.startyear === null )			data.settings.startyear = (new Date()).getFullYear();
						if( data.settings.monthstodisplay === null )	data.settings.monthstodisplay = 1;
						
						// Work out the start and end dates.
						data.settings.startdate		= $[plugin_name].date( data.settings.startyear+'-'+( Number( data.settings.startmonth ) < 10 ? '0' : '' )+Number( data.settings.startmonth )+'-01');
						data.cache.enddate			= data.settings.startdate.addMonths( data.settings.monthstodisplay );
						
						// Now work out the number of days to display.
						data.settings.daystodisplay = data.settings.startdate.getDaysBetween( data.cache.enddate );
						
						// We're showing a month calendar.
						data.type = const_month;
					}
					
					// Convert the start date to an enhanced date object.
					data.settings.startdate		= $[plugin_name].date( data.settings.startdate, data.settings.daytimestart );
					data.settings.defaultcolor	= $[plugin_name].colors.generate( data.settings.defaultcolor );
					data.settings.invalidcolor	= $[plugin_name].colors.generate( data.settings.invalidcolor );
					data.settings.minheight		= Math.round( data.settings.minheight === null ? $[plugin_name].incrementsIn( data.settings.gridincrement, '1 min' ) : data.settings.minheight );
					
					// Calculate the number of increments in a day. We use this in loops to create day blocks.
					data.cache.enddate			= data.settings.startdate.addDays(data.settings.daystodisplay);
					data.cache.incrementsInDay	= data.settings.startdate.getIncrementBetween( $[plugin_name].date( data.settings.startdate, data.settings.daytimeend ), data.settings.gridincrement );
					data.cache.incrementHeight	= data.settings.minheight;
					data.cache.dragHeight		= ( data.cache.incrementHeight / $[plugin_name].incrementsIn( data.settings.gridincrement, data.settings.dragincrement ) );
					data.cache.resourcecount	= 1;
					
					// Add the container class, and the base HTML structure
					$this.addClass( 'ui-'+plugin_name+' ui-'+plugin_name+'-container ui-'+plugin_name+'-'+data.type );
					
					// Store fragments that are shared between month and week view for this instance in the data object.
					data.elements.dateline		= fragments.dateline.clone(true);
					data.elements.container		= fragments.container.clone(true);
					data.elements.dayblock		= fragments.day.clone(true);
					data.elements.datelabel		= fragments.labels.date.clone(true);
					data.elements.resourcelabel	= fragments.labels.resource.clone(true);
					
					// Draw the correct type of calendar...
					switch( data.type ){
					
						case const_month : // Pass the data to save a call to the data API.
							
							
							// Work out the day of week for the start date, and when the week begins.
							var startDayOfWeek			= data.settings.startdate.getDay();
							var endDayOfWeek			= data.cache.enddate.addDays(1).getDay();
							var beginDayOfWeek			= data.settings.weekstart-1;
							var finishDayOfWeek			= beginDayOfWeek == 0 ? 6 : beginDayOfWeek-1;
							
							data.settings.startdate		= data.settings.startdate.addDays( ( beginDayOfWeek > startDayOfWeek ? beginDayOfWeek-7 : beginDayOfWeek ) - startDayOfWeek );
							data.cache.enddate			= data.cache.enddate.addDays( finishDayOfWeek - endDayOfWeek + 2 );
							data.settings.daystodraw	= data.settings.startdate.getDaysBetween( data.cache.enddate );
							data.cache.weekstodraw		= data.settings.startdate.getWeeksBetween( data.cache.enddate );
							
							// Add paragraph to dayblock element.
							data.elements.dayblock.append('<p/>');
							
							// Work out widths and heights
							data.cache.monthWidth		= $this.outerWidth() / data.settings.monthstodisplay
							data.cache.dayWidth			= data.cache.monthWidth / 7;
							data.cache.dayHeight		= ( $this.outerHeight() - 22 ) / data.cache.weekstodraw;
							
							// Finally, call the draw method.
							_private.draw.month.cal.apply(this,[data]);
						break;
						
						case const_week : // Pass the data to save a call to the data API.
							
							// Work out the number of resources we're displaying.
							if( $.isArray( data.settings.resources ) || typeof data.settings.resources == 'object' ){
								data.cache.resourcecount=0;
								for( var i in data.settings.resources ){
									if( data.settings.resources.hasOwnProperty( i ) ){
										data.cache.resourcecount++;
									}
								}
								
								$this.addClass('ui-'+plugin_name+'-resources');
								
								// Clone the elements from our fragment store.
								data.elements.resourceline		= fragments.resourceline.clone(true);
								data.elements.resourcelinefill	= fragments.resourcelinefill.clone(true);
							}
							
							// Add fragments that aren't shared between month and week view.
							data.elements.datelinefill	= fragments.datelinefill.clone(true);
							data.elements.timeline		= fragments.timeline.clone(true);
							data.elements.timeblock		= fragments.time.clone(true);
							data.elements.timelabel		= fragments.labels.time.clone(true);
							
							// Work out the optimum day width.
							var optimumDayWidth = ($this.outerWidth()-60) / (data.settings.daystodisplay*data.cache.resourcecount);
							
							// Work out widths and heights.
							data.cache.resourceWidth	= Math.max( data.settings.minwidth, optimumDayWidth )
							data.cache.dayWidth			= data.cache.resourceWidth * data.cache.resourcecount;
							data.cache.dayHeight		= data.cache.incrementHeight * data.cache.incrementsInDay;
							
							// Finally, call the draw method.
							_private.draw.week.cal.apply(this,[data]);
						break;
						
					}
											
					// Store the data.
					$this.data(plugin_name,data);
					
					// If we've specified an events array / object then 
					if( !$.isArray( data.settings.calendars ) ){
						data.settings.calendars = [data.settings.events];
					}
					
					// Allow addition of multiple calendars.
					$(data.settings.calendars).each(function(){
						
						var events, color;
						if( $.isArray( this ) ){ events = this; } else if( typeof this == 'string' ){ events = this } else if( $.isPlainObject( this ) ){ events = this.events; color = this.color; }
						
						if( $.isArray( events ) ){
							// Loop over the events and convert to date objects if required.
							for( var i=0; i<events.length; i++ ){
								// Set the default color if none is set already.
								if( !('color' in events[i]) ) events[i].color = color;
								methods.add.apply( $this, [events[i]] );
							}
							
						} else if( typeof events == 'string' ){
							
							// If we've been given a string, assume its a URL.
							$.ajax( events, {
								
								accepts		: 'text/calendar',
								dataType	: 'text',
								type		: 'get',
								crossDomain	: true,
								
								// Pass the calendar dates through
								// to the data request.
								data : {
									from	: data.settings.datefrom,
									to		: data.settings.dateto
								},
								
								/**
								 * iCalendar response handler.
								 *
								 * @param string response	: The iCalendar file to parse into events.
								 *
								 * @return void;
								 */
								success	: function( response ){
									
									// Parse the icalendar file.
									var calendar = _private.parse.icalendar.apply($this,[response]);
									
									// Check if we've got some valid calendar data.
									if( calendar && 'events' in calendar && $.isArray( calendar.events ) && calendar.events.length > 0 ){
										// Loop over the events and convert to date objects if required.
										for( var i=0, event; i<calendar.events.length; i++ ){
											if( !('color' in calendar.events[i]) ) calendar.events[i].color = color;
											methods.add.apply( $this, [calendar.events[i]] );
										}
									}
								}
							});
						}
					});
					
					// Clear out the events / calendars from settings.
					data.settings.calendars	= undefined;
					data.settings.events	= undefined;
					
					// Fire the onload method.
					data.settings.onload.apply($this);
				}
			});
		},
		
		/**
		 * Add a new event object to the calendar
		 *
		 * @param obj bData		: An object of key => value pairs representing an appointment.
		 *
		 * @return obj : The jQuery context (calendar collection) that this method was called from.
		 * @scope public.
		 */
		add : function( bData ){
			/* Adds a new event object to the calendar */
			
			// Get shortcuts to calendar container and data.
			var $this = $(this), data = $this.data(plugin_name);
			
			// If the calendar has been set up already...
			if( data ){
				
				// Make sure everything we need exists in bdata.
				if( !'uid' in bData )					throw _private.errors.eventParse('Missing unique id (uid)',bData);
				if( !'begins' in bData )				throw _private.errors.eventParse('Missing start date/time (begins)',bData);
				if( !'ends' in bData )					throw _private.errors.eventParse('Missing end date/time (ends)',bData);
				
				// Make sure this UID doesn't already exist.
				if( bData.uid in data.cache.events )	throw _private.errors.eventParse('UID must be unique', bData);
				
				// Parse the dates.
				var dataBegins	= $[plugin_name].date( bData.begins ),
					dataEnds	= $[plugin_name].date( bData.ends );
												
				// Clone the event element, and set up the values.
				var values	= {
					elems		: $([]),
					calendar	: $this,
					uid			: bData.uid,
					begins		: dataBegins,
					ends		: dataEnds,
					resource	: data.settings.resources && bData.resource ? _private.resourceIndex.apply( this, [bData.resource,data] ) : null ,
					colors		: bData.color ? $[plugin_name].colors.generate( bData.color ) : data.settings.defaultcolor,
					title		: bData.title || null,
					notes		: bData.notes || '',
					cache		: {},
					overlap		: {
						inset : [],
						depth : []
					}
				};
				
				// Throw an error if we've been passed an invalid resource.
				// Allow blank end dates... in the future we'll use event data 
				// with no end date/time to show 'all day' events.
				// For now, we just show them as minimum length.
				if( values.resource === false )			throw _private.errors.eventParse('Invalid resource id (resource)',bData);
				if( !(values.begins instanceof Date) )	throw _private.errors.eventParse('Invalid start date/time (begins)',bData);
								
				data.cache.events[values.uid] = values;
				$this.data(plugin_name,data);
				
				// Only create the events if 
				if( _private.inrange.apply( this, [dataBegins, dataEnds, data.settings.startdate, data.cache.enddate] ) ){				
					
					// Call the positioning code.
					_private.draw[data.type].event.apply($this,[data,values]);
				}
			}
			return $this;
		},
		
		/**
		 * Update a calendar appointment
		 *
		 * @param obj values	: An object of key => value pairs representing the data to update.
		 * @param int speed		: (Opt) Time in milliseconds for the animation. Could also be 'slow' or 'fast'.
		 * @param string ease	: (Opt) Name of the easing method to use for the animation.
		 * 
		 * @return obj : The jQuery context (calendar collection) that this method was called from.
		 * @scope public.
		 */
		update : function( values, speed, ease ){
			
			var $this	= $(this), $event,
				data	= $this.data(plugin_name);
						
			if( data ){
				
				// Update animation speed.
				if( speed === undefined ) speed = 'fast';
				
				// If we've got an array, loop through and add differences to each element.
				if( $.isArray( values ) ){
					
					// Loop through the array and apply each of the updates in turn.
					for( var i=0; i<values.length; i++ ){
						
						// Find the event element.
						$event = data.elements.container.find('div.ui-'+plugin_name+'-event[data-id="'+values[i].uid+'"]');
						
						// IF we find one, then we need to update it with the new data.
						if( $event.length > 0 ){
							_private.event.update.apply( $event, [values[i], speed, ease] );
						}
					}
					
				} else {
					
					// Find the event element.
					$event = data.elements.container.find('div.ui-'+plugin_name+'-event[data-id="'+values.uid+'"]');
					
					if( $event.length > 0 ){
						// IF we find one, then we need to update it with the new data.
						_private.event.update.apply( $event, [values, speed, ease] );
					}
				}
			}
			return $this;
		},
		
		/**
		 * Select an appointment with the given id
		 *
		 * @param mixed uid		: The UID of the event that we want to select.
		 * @param int speed		: (Opt) Time in milliseconds for the animation. Could also be 'slow' or 'fast'.
		 * @param string ease	: (Opt) Name of the easing method to use for the animation.
		 * 
		 * @return obj : The jQuery context (calendar collection) that this method was called from.
		 * @scope public.
		 */
		select : function( uid, speed, ease ){
			// Select an appointment (given the UID).
			var $this = $(this), data = $this.data(plugin_name);
			
			if( data ){
				
				// Find the event element.
				$event = data.elements.container.find('div.ui-'+plugin_name+'-event[data-id="'+uid+'"]');
				
				// IF we find one, we'll select it.
				if( $event.length > 0 ){
					_private.event.select.apply( $event, [speed, ease] );
				}
			}
			return $this;
		},
		
		/**
		 * Update or Set the settings value. This may require further data parsing, or UI updates.
		 *
		 * @param mixed key		: The key of the settings value to set or get, or an object containing a map of values to set.
		 * @param mixed value 	: (opt) The value to set into @key if @key is a string. 
		 *
		 * @return mixed : Returns the settings value if @value is omitted and @key is a string, otherwise, the jQuery collection.
		 * @scope public.
		 */
		option : function( key, value ){
			var $this = $(this), data = $this.data(plugin_name);
			
			// Only bother if we've set this up before.
			if( data ){

				// Return settings array if no key is provided.
				if( typeof key == 'undefined' ) return data.settings;
				
				if( typeof key == 'object' ){
					for( var k in key  ){
						if( key.hasOwnProperty(k) ){
							methods.option.apply($this,[k,key[k]]);
						}
					}
					return $this;
				}
				
				// The key has to exist, otherwise its invalid.
				if( !key in data.settings ) return false;
				
				// Check if we're adding or updating.
				if( typeof value == 'undefined' ){
					return data.settings[key];
				} else {
					
					switch( key ){
						case 'allowremove' :
							data.elements.container.find('div.ui-'+plugin_name+'-event span.button-remove').toggle(Boolean(value));
						break;
						case 'allowresize' : 
							data.elements.container.find('p.resize-top, p.resize-bottom').toggle(Boolean(value));
						break;
						case 'startdate' :
							
							var newdate = $[plugin_name].date( value, data.settings.daytimestart ),
								olddate = data.settings.startdate;
							
							// Set the new date details.
							data.settings.startdate = newdate;
							data.cache.enddate		= newdate.addDays(data.settings.daystodisplay);
							
							// Save the data against the plugin.
							$this.data(plugin_name,data);
							
							var event;
							
							// Detatch all of the events, as these elements have
							// data stored against them... we may want to add these later.
							for( var i in data.cache.events ){
								
								// Cache the event.
								event = data.cache.events[i];
								
								// Check if this event is in the current range.
								if( !_private.inrange.apply(this,[event.begins,event.ends,data.settings.startdate,data.cache.enddate]) ){
									if( 'elems' in event && event.elems.length > 0 ){
										// Remove this event from its container.
										event.elems.detach();
									}
								} else {
									// Redraw this element. The length and position may have changed.
									_private.draw[data.type].event.apply($this,[data,event]);
								}
							}
							
							/** TODO: This is WEEKVIEW only code... do we need to abstract this out to a new method?? **/
							
							// Modify the date attributes stored on each of the dayblocks and labels.
							// 
							var $dates		= $('div.ui-'+plugin_name+'-date',data.elements.container).removeClass('ui-'+plugin_name+'-today'),
								todayDate	= $[plugin_name].date().format('Y-m-d');
							
							switch( data.type ) {
								
								/**
								 * Different method for days.
								 */
								case const_month :
									
									// Loop over each of the dateline elements.
									$(data.elements.dayblock).removeClass('ui-'+plugin_name+'-today').each(function(i,date){
										
										// Get a shortcut to the label, and create the new date objects.
										var $date				= $(date),
											clonedDateObject	= newdate.addDays(i),
											clonedDateFormat	= clonedDateObject.format('Y-m-d');
										
										// Set the dayblock's date attribute
										$date.attr({
											'date'		: clonedDateFormat,
											'day'		: clonedDateObject.getDay()
										})
										
										.find('p')
											.html( clonedDateObject.format( 'j' ) )
										.end();
										
										// Make sure we add the 'today' class to the calendar.
										if( clonedDateFormat === todayDate ) $date.addClass('ui-'+plugin_name+'-today');
									});
									
								break;
								
								/**
								 * Different method for weeks.
								 */
								case const_week :
									
									// Loop over each of the dateline elements.
									$('div.ui-'+plugin_name+'-label-date',data.elements.dateline).removeClass('ui-'+plugin_name+'-today').each(function(i,label){
										
										// Get a shortcut to the label, and create the new date objects.
										var $label				= $(label),
											clonedDateObject	= newdate.addDays(i),
											clonedDateFormat	= clonedDateObject.format('Y-m-d');
										
										// Set the dayblock's date attribute
										$dates.eq(i).attr({
											'date'		: clonedDateFormat,
											'day'		: clonedDateObject.getDay()
										});
										
										// Set the labels date attribute.
										$label.attr({
											'date'	: clonedDateFormat,
											'day'	: clonedDateObject.getDay() 
										})
										.find('p')
											.html( clonedDateObject.format( data.settings.maskdatelabel ) )
										.end();
										
										// Make sure we add the 'today' class to the calendar.
										if( clonedDateFormat === todayDate ) $label.add($dates.eq(i)).addClass('ui-'+plugin_name+'-today');
									});
								break;
								
							}
							
							/**
							 * TODO:
							 * This is almost the code we need... we've just got to figure out
							 * a mechanism of storing the old layouts safely where we can re-use them.
							 * We don't want to have to clone the layout again... in fact, it would be better
							 * if we didn't clone the entire layout at all. Would be much more efficient,
							 * and far less error prone to create the new layouts on the fly as we need them.
							 * Or maybe even create them one in advance (after the animation has run).
							 */
							
//							var old_container	= data.elements.container,
//								old_dateline	= data.elements.dateline;
//							
//							data.elements.container = old_container.clone(true).appendTo($this);
//							data.elements.dateline	= old_dateline.clone(true).appendTo($this);
//														
//							data.elements.dateline
//								.add(data.elements.container)
//								.css({
//									left	: (olddate>newdate?'-':'+')+'='+old_container.width(),
//									width	: old_container.width()
//								})
//							
//							data.elements.dateline
//								.add(data.elements.container)
//								.add(old_container)
//								.add(old_dateline)
//								.animate({
//									left : (olddate>newdate?'+':'-')+'='+data.elements.container.width()
//								}, 'fast', data.settings.easing.datechange, function(){
//									old_container.remove();
//									old_dateline.remove();
//								});
							
							return $this;
							
						break;
						
						default: data.settings[key] = value; break;
					}
					
					return $this;
				}
			}			
		},
		
		version : function(){
			// Returns the version string for this plugin.
			return plugin_name+' v'+plugin_version;
		},
		
		destroy: function(){
			/* Remove the ui plugin from these elements that have it */
			
			return this.each(function(){
			
				var $this = $(this),
					data = $this.data(plugin_name);
				
				// Only bother if we've set this up before.
				if( data ){
					
					// Remove all of the events, as these elements have
					// data stored against them... we need to make sure
					// its cleaned up properly.
					for( var i=0; i<data.cache.events.length; i++ ){
						data.cache.events[i].elems.remove();
					}
					
					// Now, remove all data, and empty the container.
					$this.removeData(plugin_name);
					$this.empty();
				}
			});
		}
	};
	
	$.fn[plugin_name] = function( method ){
		// Method calling logic
		if ( methods[method] ) {
			return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || ! method ) {
			return methods.init.apply( this, arguments );
		} else {
			$.error( 'Method ' +  method + ' does not exist on jQuery.' + plugin_name );
		}	
	}

	$[plugin_name] = {};
	$[plugin_name].colors = {
		// Store the whole list of HTML colors.
		// Yep… pretty ugly, but useful if you want to support text colors…
		// TODO: Maybe abstract this bit out into an addon if the dev wants
		//		 support for named colors… or use a placeholder element and
		//		 getComputedStyle to convert the color into a more useful
		//		 format that can then be converted to hex or rgb.
		named	 : {
			aliceblue				: '#F0F8FF',
			antiquewhite			: '#FAEBD7',
			aqua					: '#00FFFF',
			aquamarine				: '#7FFFD4',
			azure					: '#F0FFFF',
			beige					: '#F5F5DC',
			bisque					: '#FFE4C4',
			black					: '#000000',
			blanchedalmond			: '#FFEBCD',
			blue					: '#0000FF',
			blueviolet				: '#8A2BE2',
			brown					: '#A52A2A',
			burlywood				: '#DEB887',
			cadetblue				: '#5F9EA0',
			chartreuse				: '#7FFF00',
			chocolate				: '#D2691E',
			coral					: '#FF7F50',
			cornflowerblue			: '#6495ED',
			cornsilk				: '#FFF8DC',
			crimson					: '#DC143C',
			cyan					: '#00FFFF',
			darkblue				: '#00008B',
			darkcyan				: '#008B8B',
			darkgoldenrod			: '#B8860B',
			darkgray				: '#A9A9A9',
			darkgreen				: '#006400',
			darkkhaki				: '#BDB76B',
			darkmagenta				: '#8B008B',
			darkolivegreen			: '#556B2F',
			darkorange				: '#FF8C00',
			darkorchid				: '#9932CC',
			darkred					: '#8B0000',
			darksalmon				: '#E9967A',
			darkseagreen			: '#8FBC8F',
			darkslateblue			: '#483D8B',
			darkslategray			: '#2F4F4F',
			darkturquoise			: '#00CED1',
			darkviolet				: '#9400D3',
			deeppink				: '#FF1493',
			deepskyblue				: '#00BFFF',
			dimgray					: '#696969',
			dodgerblue				: '#1E90FF',
			firebrick				: '#B22222',
			floralwhite				: '#FFFAF0',
			forestgreen				: '#228B22',
			fuchsia					: '#FF00FF',
			gainsboro				: '#DCDCDC',
			ghostwhite				: '#F8F8FF',
			gold					: '#FFD700',
			goldenrod				: '#DAA520',
			gray					: '#808080',
			green					: '#008000',
			greenyellow				: '#ADFF2F',
			honeydew				: '#F0FFF0',
			hotpink					: '#FF69B4',
			indianred				: '#CD5C5C',
			indigo					: '#4B0082',
			ivory					: '#FFFFF0',
			khaki					: '#F0E68C',
			lavender				: '#E6E6FA',
			lavenderblush			: '#FFF0F5',
			lawngreen				: '#7CFC00',
			lemonchiffon			: '#FFFACD',
			lightblue				: '#ADD8E6',
			lightcoral				: '#F08080',
			lightcyan				: '#E0FFFF',
			lightgoldenrodyellow	: '#FAFAD2',
			lightgrey				: '#D3D3D3',
			lightgreen				: '#90EE90',
			lightpink				: '#FFB6C1',
			lightsalmon				: '#FFA07A',
			lightseagreen			: '#20B2AA',
			lightskyblue			: '#87CEFA',
			lightslategray			: '#778899',
			lightsteelblue			: '#B0C4DE',
			lightyellow				: '#FFFFE0',
			lime					: '#00FF00',
			limegreen				: '#32CD32',
			linen					: '#FAF0E6',
			magenta					: '#FF00FF',
			maroon					: '#800000',
			mediumaquamarine		: '#66CDAA',
			mediumblue				: '#0000CD',
			mediumorchid			: '#BA55D3',
			mediumpurple			: '#9370D8',
			mediumseagreen			: '#3CB371',
			mediumslateblue			: '#7B68EE',
			mediumspringgreen		: '#00FA9A',
			mediumturquoise			: '#48D1CC',
			mediumvioletred			: '#C71585',
			midnightblue			: '#191970',
			mintcream				: '#F5FFFA',
			mistyrose				: '#FFE4E1',
			moccasin				: '#FFE4B5',
			navajowhite				: '#FFDEAD',
			navy					: '#000080',
			oldlace					: '#FDF5E6',
			olive					: '#808000',
			olivedrab				: '#6B8E23',
			orange					: '#FFA500',
			orangered				: '#FF4500',
			orchid					: '#DA70D6',
			palegoldenrod			: '#EEE8AA',
			palegreen				: '#98FB98',
			paleturquoise			: '#AFEEEE',
			palevioletred			: '#D87093',
			papayawhip				: '#FFEFD5',
			peachpuff				: '#FFDAB9',
			peru					: '#CD853F',
			pink					: '#FFC0CB',
			plum					: '#DDA0DD',
			powderblue				: '#B0E0E6',
			purple					: '#800080',
			reactorblue				: '#0266A1',
			red						: '#FF0000',
			rosybrown				: '#BC8F8F',
			royalblue				: '#4169E1',
			saddlebrown				: '#8B4513',
			salmon					: '#FA8072',
			sandybrown				: '#F4A460',
			seagreen				: '#2E8B57',
			seashell				: '#FFF5EE',
			sienna					: '#A0522D',
			silver					: '#C0C0C0',
			skyblue					: '#87CEEB',
			slateblue				: '#6A5ACD',
			slategray				: '#708090',
			snow					: '#FFFAFA',
			springgreen				: '#00FF7F',
			steelblue				: '#4682B4',
			tan						: '#D2B48C',
			teal					: '#008080',
			thistle					: '#D8BFD8',
			tomato					: '#FF6347',
			turquoise				: '#40E0D0',
			violet					: '#EE82EE',
			wheat					: '#F5DEB3',
			white					: '#FFFFFF',
			whitesmoke				: '#F5F5F5',
			yellow					: '#FFFF00',
			yellowgreen				: '#9ACD32'
		},
		
		// Methods to convert HEX colors into RGB colors.
		HexToRGB	: function(h,a){ return (a!==undefined?'rgba':'rgb')+'('+$[plugin_name].colors.HexToR(h)+', '+$[plugin_name].colors.HexToG(h)+', '+$[plugin_name].colors.HexToB(h)+(a!==undefined?', '+a+')':')'); },
		HexToR		: function(h){return parseInt(($[plugin_name].colors.cutHex(h)).substring(0,2),16)},
		HexToG		: function(h){return parseInt(($[plugin_name].colors.cutHex(h)).substring(2,4),16)},
		HexToB		: function(h){return parseInt(($[plugin_name].colors.cutHex(h)).substring(4,6),16)},
		cutHex		: function(h){return (h.charAt(0)=="#") ? $[plugin_name].colors.padHex( h.substring(1,7) ): $[plugin_name].colors.padHex(h) },
		padHex		: function(h){return h.length > 3 ? h : h.substring(0,1)+h.substring(0,1)+h.substring(1,2)+h.substring(1,2)+h.substring(2,3)+h.substring(2,3) ; },
		
		HueToRGB : function(p, q, t){
		    if(t < 0) t += 1;
		    if(t > 1) t -= 1;
		    if(t < 1/6) return p + (q - p) * 6 * t;
		    if(t < 1/2) return q;
		    if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
		    return p;
		},
		
		HSLToRGB : function(h, s, l, a, f){
		    var r, g, b;
			
			// Convert HSL back to fractions.
			h/=360;s/=100;l/=100;
			
		    if(s == 0){
		        r = g = b = l; // achromatic
		    }else{
		        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		        var p = 2 * l - q;
		        r = $[plugin_name].colors.HueToRGB(p, q, h + 1/3);
		        g = $[plugin_name].colors.HueToRGB(p, q, h);
		        b = $[plugin_name].colors.HueToRGB(p, q, h - 1/3);
		    }
			
			var rgb = [Math.round(r*255),Math.round(g*255),Math.round(b*255)];
			
			// If we've specified an alpha level, then we want to include that in the result.
		    if( f ){ if(a!==undefined){ rgb[3]=a }; return rgb; };
		    return (a!==undefined?'rgba':'rgb')+'('+rgb.join(', ')+(a!==undefined?', '+a+')':')');
		},
		
		// Method to convert RGB to HSL for manipulation.
		RGBToHSL : function(r, g, b){
		    r /= 255, g /= 255, b /= 255;
		    var max = Math.max(r, g, b), min = Math.min(r, g, b);
		    var h, s, l = (max + min) / 2;
		
		    if(max == min){
		        h = s = 0; // achromatic
		    }else{
		        var d = max - min;
		        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		        switch(max){
		            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
		            case g: h = (b - r) / d + 2; break;
		            case b: h = (r - g) / d + 4; break;
		        }
		        h /= 6;
		    }
			
			// Convert HSL from fractions.
		    return [Math.round(h*360), Math.round(s*100), Math.round(l*100)];
		},
		
		brightness : function (r, g, b){
			// Returns the brightness of a color.
			return ((r*299)+(g*587)+(b*114))/1000;
		},
				
		// Generate a bunch of complimentary colors from the given color for use in the calendar.
		generate : function( color ){
			
			var step = 10;
			
			// Check to see if we've been passed a named color.
			if( color in $[plugin_name].colors.named ){
				// Look up the hex representation for this named color.
				color = $[plugin_name].colors.named[color];
			}
			
			// First check if we've got a hex color...
			if( color.match( /^#?([0-9A-Fa-f]{3,6})$/ ) ){
				// Get the red, green and blue values from the hex color.  
				var rgb = [
					$[plugin_name].colors.HexToR(color),
					$[plugin_name].colors.HexToG(color),
					$[plugin_name].colors.HexToB(color)
				];
				
				// Now convert into HSL.
				var hsl = $[plugin_name].colors.RGBToHSL( rgb[0], rgb[1], rgb[2] );
				
			// Checks (pretty exhaustively) if the colour is an RGB colour.
			} else if ( color.replace( / /g, '' ).match( /([rR][gG][bB]\s*\(\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*,\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*,s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*\))|([rR][gG][bB]\(\s*(\d?\d%|100%)+\s*,\s*(\d?\d%|100%)+\s*,\s*(\d?\d%|100%)+\s*\))/ ) ){
				// if it is, we remove everythign but the numbers and commas, then split it out into an array.
				var rgb = color.replace( /[a-zA-Z\(\) ]/g, '' ).split( ',' );
				var hsl = $[plugin_name].colors.RGBToHSL( rgb[0], rgb[1], rgb[2] );
				
			// Otherwise, throw an error…
			} else if( color.replace( / /g, '' ).match( /([hH][sS][lL]\s*\(\s*([0-9]|[1-9][0-9]|[1-2][0-9][0-9]|3[0-5][0-9]|360)\s*,\s*(\d?\d%|100%)\s*,\s*(\d?\d%|100%)\s*\))/ ) ){
				
				// Split into HSL array.
				var hsl = color.replace( /[a-zA-Z\(\) %]/g, '' ).split( ',' );
				
			} else {
				throw new Error('Invalid Colour: could not parse '+color+' as a color.');
			}
			
			// If there isn't enough room for manipulation
			// then just make room on the base color.
			if( hsl[1] < step )		hsl[1]+=step;
			if( hsl[1] > 100-step ) hsl[1]-=step;
			if( hsl[2] > 100-step )	hsl[2]-=step;
			if( hsl[2] < step )		hsl[2]+=step;
			
			// Function to shortcut the stepping method.
			function stepLighter(c,s,a){
				var h=$.extend([],c);
				h[1]=Math.max(0,h[1]+(s/2));
				h[2]=Math.min(100,h[2]+s);
				if(a!==undefined)h[3]=a;
				return h;
			}
			
			function stepDarker(c,s,a){
				var h=$.extend([],c);
				h[2]=Math.max(0,h[2]-s);
				if(a!==undefined)h[3]=a;
				return h;
			}
			
			// Reused values…
			var txtShadow = $[plugin_name].colors.HSLToRGB.apply( this, stepLighter(hsl,step*5,.3) );
			var boxShadow = $[plugin_name].colors.HSLToRGB.apply( this, stepLighter(hsl,step*3,.75) );
			var textColor = ( $[plugin_name].colors.brightness.apply( this, $[plugin_name].colors.HSLToRGB( hsl[0], hsl[1], hsl[2], undefined, true ) ) > 125 ? '#333333' : '#FFFFFF' );
			
			// Convert our HSL colors back into RGB… there are
			// some browsers which don't support HSL correctly.
			return {
				original			: color,
				mainBackground		: $[plugin_name].colors.HSLToRGB.apply( this, hsl ),
				mainTextShadow		: txtShadow,
				mainShadow			: boxShadow,
				mainText			: textColor,
				mainSelected		: $[plugin_name].colors.HSLToRGB.apply( this, stepDarker(hsl,step) ),
				detailsBackground	: $[plugin_name].colors.HSLToRGB.apply( this, stepLighter(hsl,step) ),
				detailsTextShadow	: txtShadow,
				detailsShadow		: boxShadow,
				detailsText			: textColor
			};
		}
	};	
	
	$[plugin_name].lang = {
		// Use ISO 639-1 language codes.
		'en' : {
			// Text date/time representations.
			short_month 	: Array('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'),
			long_month		: Array('January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'),
			short_day		: Array('Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'),
			long_day		: Array('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'),
			// Text labels.
			label_remove	: 'Remove',
			label_today		: 'Today'
		}
	};
	
	// You must call these methods in the context of a date object.
	// Formats the string from the localized time.
	var _replace = {
		// Day
		d: function() { return (this.getDate() < 10 ? '0' : '') + this.getDate(); },
		D: function() { return $[plugin_name].lang[this.lang].short_day[this.getDay()]; },
		j: function() { return this.getDate(); },
		l: function() { return $[plugin_name].lang[this.lang].long_day[this.getDay()]; },
		N: function() { return this.getDay() + 1; },
		S: function() { return (this.getDate() % 10 == 1 && this.getDate() != 11 ? 'st' : (this.getDate() % 10 == 2 && this.getDate() != 12 ? 'nd' : (this.getDate() % 10 == 3 && this.getDate() != 13 ? 'rd' : 'th'))); },
		w: function() { return this.getDay(); },
		z: function() { if( window.console ){ console.error('Mask \'z\' Not Yet Supported'); }; return "z"; },
		// Week
		W: function() { var onejan = new Date(this.getFullYear(),0,1); return Math.ceil((((this - onejan) / 86400000 ) + onejan.getDay()+1)/7); },
		// Month
		F: function() { return $[plugin_name].lang[this.lang].long_month[this.getMonth()]; },
		m: function() { return (this.getMonth()+1 < 10 ? '0' : '') + (this.getMonth() + 1); },
		M: function() { return $[plugin_name].lang[this.lang].short_month[this.getMonth()]; },
		n: function() { return this.getMonth() + 1; },
		t: function() { return (new Date((new Date(this.getFullYear(), this.getMonth()+1,1))-1)).getDate(); },
		// Year
		L: function() { if( window.console ){ console.error('Mask \'L\' Not Yet Supported'); }; return "L"; },
		o: function() { if( window.console ){ console.error('Mask \'o\' Not Yet Supported'); }; return "o"; },
		Y: function() { return this.getFullYear(); },
		y: function() { return ('' + this.getFullYear()).substr(2); },
		// Time
		a: function() { return this.getHours() < 12 ? 'am' : 'pm'; },
		A: function() { return this.getHours() < 12 ? 'AM' : 'PM'; },
		B: function() { if( window.console ){ console.error('Mask \'B\' Not Yet Supported'); }; return "B"; },
		g: function() { return this.getHours() == 0 ? 12 : (this.getHours() > 12 ? this.getHours() - 12 : this.getHours()); },
		G: function() { return this.getHours(); },
		h: function() { return (this.getHours() < 10 || (12 < this.getHours() < 22) ? '0' : '') + (this.getHours() < 10 ? this.getHours() + 1 : this.getHours() - 12); },
		H: function() { return (this.getHours() < 10 ? '0' : '') + this.getHours(); },
		i: function() { return (this.getMinutes() < 10 ? '0' : '') + this.getMinutes(); },
		s: function() { return (this.getSeconds() < 10 ? '0' : '') + this.getSeconds(); },
		// Timezone
		e: function() { if( window.console ){ console.error('Mask \'e\' Not Supported'); }; return "e"; },
		I: function() { if( window.console ){ console.error('Mask \'I\' Not Supported'); }; return "I"; },
		O: function() { return this.toString().match(/GMT([+-][0-9]+) \(([a-zA-Z]+)\)/)[1]; },
		P: function() { var str = this.toString().match(/GMT([+-][0-9]+) \(([a-zA-Z]+)\)/)[1].split(''); str.splice(-2,0,':'); return str.join(''); },
		T: function() { return this.toString().match(/GMT([+-][0-9]+) \(([a-zA-Z]+)\)/)[2]; },
		Z: function() { return this.getTimezoneOffset() * 60; },
		// Full Date/Time
		c: function() { return _replace.Y.apply(this)+'-'+_replace.m.apply(this)+'-'+_replace.d.apply(this)+'T'+_replace.H.apply(this)+':'+_replace.i.apply(this)+':'+_replace.s.apply(this)+_replace.P.apply(this); },
		C: function() { return _replace.c.apply(this).replace(_replace.P.apply(this),'')+'Z'; },
		r: function() { return this.toString(); },
		U: function() { return this.getTime() / 1000; }
	};

	// You must call these methods in the context of a date object.
	// Formats the string from the UTC time. 
	var _replaceUTC = {
		// Day
		d: function() { return (this.getUTCDate() < 10 ? '0' : '') + this.getUTCDate(); },
		D: function() { return $[plugin_name].lang[this.lang].short_day[this.getUTCDay()]; },
		j: function() { return this.getUTCDate(); },
		l: function() { return $[plugin_name].lang[this.lang].long_day[this.getUTCDay()]; },
		N: function() { return this.getUTCDay() + 1; },
		S: function() { return (this.getUTCDate() % 10 == 1 && this.getUTCDate() != 11 ? 'st' : (this.getUTCDate() % 10 == 2 && this.getUTCDate() != 12 ? 'nd' : (this.getUTCDate() % 10 == 3 && this.getUTCDate() != 13 ? 'rd' : 'th'))); },
		w: function() { return this.getUTCDay(); },
		z: _replace.z,
		// Week
		W: function() { var onejan = new Date(this.getUTCFullYear(),0,1); return Math.ceil((((this - onejan) / 86400000 ) + onejan.getUTCDay()+1)/7); },
		// Month
		F: function() { return $[plugin_name].lang[this.lang].long_month[this.getUTCMonth()]; },
		m: function() { return (this.getUTCMonth()+1 < 10 ? '0' : '') + (this.getUTCMonth() + 1); },
		M: function() { return $[plugin_name].lang[this.lang].short_month[this.getUTCMonth()]; },
		n: function() { return this.getUTCMonth() + 1; },
		t: function() { return (new Date((new Date(this.getUTCFullYear(), this.getUTCMonth()+1,1))-1)).getUTCDate(); },
		// Year
		L: _replace.L,
		o: _replace.o,
		Y: function() { return this.getUTCFullYear(); },
		y: function() { return ('' + this.getUTCFullYear()).substr(2); },
		// Time
		a: function() { return this.getUTCHours() < 12 ? 'am' : 'pm'; },
		A: function() { return this.getUTCHours() < 12 ? 'AM' : 'PM'; },
		B: _replace.B,
		g: function() { return this.getUTCHours() == 0 ? 12 : (this.getUTCHours() > 12 ? this.getUTCHours() - 12 : this.getUTCHours()); },
		G: function() { return this.getUTCHours(); },
		h: function() { return (this.getUTCHours() < 10 || (12 < this.getUTCHours() < 22) ? '0' : '') + (this.getUTCHours() < 10 ? this.getUTCHours() + 1 : this.getUTCHours() - 12); },
		H: function() { return (this.getUTCHours() < 10 ? '0' : '') + this.getUTCHours(); },
		i: function() { return (this.getUTCMinutes() < 10 ? '0' : '') + this.getUTCMinutes(); },
		s: function() { return (this.getUTCSeconds() < 10 ? '0' : '') + this.getUTCSeconds(); },
		// Timezone (mostly irrelevant for UTC replaces…)
		e: _replace.e,
		I: _replace.I,
		O: _replace.O,
		P: _replace.P,
		T: _replace.T,
		Z: _replace.Z,
		// Full Date/Time
		c: function() { return _replaceUTC.Y.apply(this)+'-'+_replaceUTC.m.apply(this)+'-'+_replaceUTC.d.apply(this)+'T'+_replaceUTC.H.apply(this)+':'+_replaceUTC.i.apply(this)+':'+_replaceUTC.s.apply(this)+_replaceUTC.P.apply(this); },
		C: function() { return _replaceUTC.c.apply(this).replace(_replaceUTC.P.apply(this),'')+'Z'; },
		r: _replace.r,
		U: function() { return this.getUTCTime() / 1000; }
	};
	
	$[plugin_name].format = function(date,format,utc){
		/* Format a string based on a date mask. */
		
		// Init variables.
		var formatted = '', charat = '';
		var replace = utc ? _replaceUTC : _replace;
		
		// Loop through the array, and format the string.
		for( var i=0; i<format.length; i++ ){
			charat = format.charAt(i);
			if( charat == '\\' && replace[format.charAt(i+1)] ){
				formatted += format.charAt(i+1);
				i++;
			} else if (_replace[charat]){
				formatted += replace[charat].call(date);
			} else {
				formatted += charat;
			}
		}
		// Return the formatted string.
		return formatted;
	};
	
	// String should be ISO8601 LongPattern format
	// 'Y-m-d H:i:s' e.g., '2011-06-11 14:30:00'
	$[plugin_name].date = function( newdate, newtime, lang ){
		
		var NewDate;
		var NewTime;
		
		// If we've been passed a date, just use that.
		if( newdate instanceof Date ){
						
			// Clone the date object, and extend with the methods below.
			NewDate = new Date(Date.UTC(
				newdate.getUTCFullYear(),
				newdate.getUTCMonth(),
				newdate.getUTCDate(),
				newdate.getUTCHours(),
				newdate.getUTCMinutes(),
				newdate.getUTCSeconds(),
				0
			));
			
			if( newtime !== undefined ){
				// Parse out the time… check if its valid, and then grab the hours minutes and seconds.
				var ValidTime = newtime.match( /[0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2}([Zz])?/ ) ? true : newtime == '' ? true : false ;
				
				if( ValidTime ){
					var h,i,d; h=i=s=0;
					
					newtime = newtime.split(':'); h = newtime[0]; i = newtime[1]; s = newtime[2];
					
					if( ( newtime[3] || '' ).toLowerCase() == 'z' ){
						NewDate.setUTCHours(h);
						NewDate.setUTCMinutes(i);
						NewDate.setUTCSeconds(s);
					} else {
						NewDate.setHours(h);
						NewDate.setMinutes(i);
						NewDate.setSeconds(s);
					}
				}
			}
			
			// Check if we've already extended newdate...
			if( 'lang' in NewDate ) return NewDate;
			
		// If we've been passed a string try parse that into a date. 
		} else if( typeof newdate == 'string' || ( newdate && typeof newdate == 'object' && 'toString' in newdate ) ){
			// Make sure we don't have a blank string.
			if( newdate.toString() !== '' ){
				// Split out the start and end times.
				var datetime = newdate.toString().split(/[Tt ]/);
				
				// Use newtime if one has been explicitly passed.
				if( newtime !== undefined ){ datetime[1] = !newtime ? '' : newtime ; }
				
				// Split the given times.
				var split_date	= 0 in datetime ? ( datetime[0]=='' ? null : datetime[0].match( /([0-9]{2,4})-?([0-9]{2})-?([0-9]{2})/ ) ) : null ;
				var split_time	= 1 in datetime ? ( datetime[1]=='' ? null : datetime[1].match( /([0-9]{2}):?([0-9]{2}):?([0-9]{2})([Zz])?/ ) ) : null ;
				
				// Check if we have valid dates and times (Dont count blank dates and times as invalid... fill these in with reasonable defaults.)
				if( split_date === null ){ var _d = new Date(); split_date = ['',_d.getFullYear(),_d.getMonth()+1,_d.getDate()]; }
				if( split_time === null ) split_time = ['',0,0,0];
				
				// If we have a valid date and time...
				if( split_date && split_time ){
					
					// Assign the split time values.
					var y=split_date[1],m=split_date[2]-1,d=split_date[3],h=split_time[1],i=split_time[2],s=split_time[3];
					
					if( ( split_time[4] || '' ).toLowerCase() == 'z' ){
						// Get the new date object... Create in UTC, and convert to current browser time.
						NewDate = new Date(Date.UTC( y, m, d, h, i, s, 0 )); // create new date object (we're not concerned with Milliseconds). 
					} else {
						// Get the new date object... Create in local time.
						NewDate = new Date(y, m, d, h, i, s); // create new date object
					}
				}
			}
		}
		
		// Make sure we got a new date...
		if( !( NewDate instanceof Date ) || isNaN( NewDate ) ) NewDate = new Date();
		
		// Default to EN, unless otherwise specified.
		NewDate.lang = lang || 'en';
		
		NewDate.roundToDay = function(){
			// Rounds a date object to the beginning of that day.
			return $[plugin_name].date(new Date( this.getUTCFullYear(), this.getUTCMonth(), this.getUTCDate(), 0, 0, 0 ));
		};
		
		NewDate.roundToMonth = function(){
			// Rounds a date object to the beginning of that month.
			return $[plugin_name].date(new Date( this.getUTCFullYear(), this.getUTCMonth(), 1, 0, 0, 0 ));
		}
		
		NewDate.getUTCTime = function(){
			// Gets the number of milliseconds since January 1, 1970 according to UTC.
			return this.getTime()+(this.getTimezoneOffset()*60000);
		};
		
		NewDate.getYearsBetween = function(d,round) {
			// returns years and fraction between dates
			var months = this.getMonthsBetween(d);
			return Math.floor( months/12 );
		};
		
		NewDate.getMonthsBetween = function(d,round) {
			// gets the number of months between two Javascript date objects.
			// Rounded to the start of each week.
			var tmp1 = this.copy(), tmp2 = d.copy();
			
			// Work out the number of days in each month.
			var daysInTmp1	= tmp1.copy(); daysInTmp1.setDate(1); daysInTmp1.setMonth( daysInTmp1.getMonth()+1 ); daysInTmp1.setDate(0); daysInTmp1 = daysInTmp1.getDate();
			var daysInTmp2	= tmp2.copy(); daysInTmp2.setDate(1); daysInTmp2.setMonth( daysInTmp2.getMonth()+1 ); daysInTmp2.setDate(0); daysInTmp2 = daysInTmp2.getDate();
				
			// Round the date to the first day of that month.
			if(round){ tmp1.setDate( 1 ); tmp2.setDate( 1 ); }
			var dateStart	= tmp1.getFullYear() * 12 + tmp1.getMonth();
			var dateEnd		= tmp2.getFullYear() * 12 + tmp2.getMonth();
			
			if( !round ){ // If we are rounding, we dont add the date position on.
				dateStart	+= ( ( ( tmp1.getDate()+(tmp1.getHours()/24)+(tmp1.getMinutes()/24/60)-1 ) / daysInTmp1 ) );
				dateEnd		+= ( ( ( tmp2.getDate()+(tmp2.getHours()/24)+(tmp1.getMinutes()/24/60)-1 ) / daysInTmp2 ) );
			}
			
			return dateEnd - dateStart;
		};
		
		NewDate.getWeeksBetween = function(d,round) {
			// Gets the number of weeks between two Javascript date objects.
			// Rounded to the start of the beginning week.
			var tmp1 = this.copy();	var tmp2 = d.copy();
			if(round){ tmp1 = tmp1.addDays( 1 - tmp1.getDay() ); tmp1.setHours( 0, 0, 0, 0 ); }
			var result = tmp1.getDaysBetween( tmp2 ) / 7;
			return ( round ? Math.floor( result ) : result );
		}
		
		NewDate.getDaysBetween = function(d,round) {
			// gets the number of days between two Javascript date objects.
			// Rounded to the start of the calling day.
			var tmp = d.copy();
			if(round) tmp.setHours( this.getHours(), this.getMinutes(), this.getSeconds(), this.getMilliseconds() );       
			var tzdif = ((-this.getTimezoneOffset()/60) - (-tmp.getTimezoneOffset()/60))*3600000;
			var time = tmp.getTime() - this.getTime();
			return (time-tzdif)/86400000;
		};
		
		NewDate.getHoursBetween = function(d,round) {
			// gets the number of hours between two Javascript date objects.
			// Rounded to the start of the calling hour
			var tmp = d.copy();
			if(round) tmp.setMinutes( this.getMinutes(), this.getSeconds(), this.getMilliseconds() );
			var tzdif = ((-this.getTimezoneOffset()/60) - (-tmp.getTimezoneOffset()/60))*3600000;
			var time = tmp.getTime() - this.getTime();
			return (time-tzdif)/3600000;
		};
		
		NewDate.getMinutesBetween = function(d,round) {
			// gets the number of minutes between two Javascript date objects.
			// Rounded to the start of the calling minute.
			var tmp = d.copy();
			if(round) tmp.setSeconds( this.getSeconds(), this.getMilliseconds() );
			var tzdif = ((-this.getTimezoneOffset()/60) - (-tmp.getTimezoneOffset()/60))*3600000;
			var time = tmp.getTime() - this.getTime();
			return (time-tzdif)/60000;
		};
		
		NewDate.getSecondsBetween = function(d,round){
			// Gets the number of seconds between two javascript date objects.
			return round ? Math.round( this.getMinutesBetween(d) * 60 ) : this.getMinutesBetween(d) * 60 ;
		}
		
		NewDate.addYears = function(c){
			// Adds the number of years to the date.
			var y = Math.floor( c );
			var m = Math.floor( ( c - y ) * 12 );
			
			var newDate = this.copy();
			newDate.setFullYear( this.getFullYear() + y );
			newDate.setMonth( this.getMonth() + m );
			return newDate;
		};
		
		NewDate.addMonths = function(c){
			// Adds the number of months to the date.
			var m = Math.floor( c );
			
			var newDate = this.copy();
			newDate.setMonth( this.getMonth() + m );
			return newDate;
		};
		
		NewDate.addDays = function(c){
			// adds the number of days to the date.
			var d = Math.floor( c );
			var h = Math.floor( ( c - d ) * 24 );
			var i = Math.floor( ( ( c - d ) - ( h / 24 ) ) * 24 * 60 );
			var s = Math.floor( ( ( c - d ) - ( h / 24 ) - ( i / 24 / 60 ) ) * 24 * 60 * 60 );
				
			var newDate = this.copy();
			newDate.setDate( this.getDate()+d );	
			newDate.setHours( this.getHours()+h );
			newDate.setMinutes( this.getMinutes()+i );
			newDate.setSeconds( this.getSeconds()+s );
			return newDate;
		};
		
		NewDate.addHours = function(d){
			// adds the number of hours to the date.
			var h = Math.floor( d );
			var i = Math.floor( ( d - h ) * 60 );
			var s = Math.floor( ( ( d - h ) - ( i / 60 ) ) * 60 * 60);
			
			var newDate = this.copy();
			newDate.setHours( this.getHours()+h );
			newDate.setMinutes( this.getMinutes()+i );
			newDate.setSeconds( this.getSeconds()+s );
			return newDate;
		};
		
		NewDate.addMinutes = function(d){
			// adds the number of minutes to the date.
			var i = Math.floor( d );
			var s = Math.floor( ( d - i ) * 60 );
			
			var newDate = this.copy();
			newDate.setMinutes( this.getMinutes()+i );
			newDate.setSeconds( this.getSeconds()+s );
			return newDate;
		};
		
		NewDate.addSeconds = function(d){
			// adds the number of seconds to the date.
			var s = Math.floor( d );
			
			var newDate = this.copy();
			newDate.setSeconds( this.getSeconds()+s );
			return newDate;
		};
		
		NewDate.copy = function(){
			// copies a date object… this is less efficient than using the
			// previous date prototype method, but needed to maintain chaining.
			// I'd prefer to not have this plugin extend the date object's prototype.
			return $[plugin_name].date(this.format('Y-m-d H:i:s'));
		};
		
		NewDate.format = function( mask ){
			// Shortcut for plugin formatting.
			return $[plugin_name].format(this,mask);
		};
		
		NewDate.formatUTC = function( mask ){
			// Shortcut for plugin formatting as UTC.
			return $[plugin_name].format(this,mask,true);
		};
		
		NewDate.incrementBy = function( value, amount ){
			/* Increment a date by a specific textual representation, i.e., '2 weeks'. */
						
			// If we've specified an amount, but the amount we specified is not greater than 0 (or is not a number).
			if( amount !== undefined && ( isNaN( Number( amount ) ) || !( Number( amount ) !== 0 ) ) ) return this;
			
			// Make sure there is a valid value.
			if( !( typeof value == 'string' || typeof value == 'number' ) && ( value == null || value == undefined || value == false || !('toString' in value) ) ) return this.copy();
			
			// Figure out how much we actually need to increment by.
			var split		= value.split(' ');
			var increment	= Number( split[0] );
			var unit		= split[1] || 'hour';
			
			// If amount is a number, we add the increment 'amount' times.
			if( amount !== null && amount !== undefined && amount !== false && !isNaN( amount ) ) increment = increment * amount;
			
			// Make sure there's something to increment by.
			if( increment !== 0 ){
				// Remove trailing 's', and change value to lower case.
				switch( unit.toString().replace(/s$/,'').toLowerCase() ){
					
					// Supported units for dates...
					case 'sec'		:
					case 'second' 	: return this.addMinutes( increment/60 );
					case 'min'		:
					case 'minute' 	: return this.addMinutes( increment );
					case 'hour'		: return this.addHours( increment );
					case 'day'		: return this.addDays( increment );
					case 'week'		: return this.addDays( increment * 7 );
					case 'month'	: return this.addMonths( increment );
					case 'year'		: return this.addYears( increment );
				}
			}
			
			return this.copy();
		};
		
		NewDate.getIncrementBetween = function( date, value ){
			/* Get the given increment between two dates */
			
			// Make sure we've been passed valid numbers.
			if( !( date instanceof Date) || !value ) return 0;
			
			// Figure out how much we actually need to increment by.
			var split		= value.split(' ');
			var increment	= Number( split[0] );
			var unit		= split[1] || 'hour';
			
			// Make sure there's something to increment by.
			if( increment !== 0 ){
				// Remove trailing 's', and change value to lower case.
				switch( unit.toString().replace(/s$/,'').toLowerCase() ){
					
					// Supported units for dates...
					case 'sec'		:
					case 'second' 	: return ( ( this.getMinutesBetween( date ) / 60 ) / increment );
					case 'min'		:
					case 'minute' 	: return ( this.getMinutesBetween( date ) / increment );
					case 'hour'		: return ( this.getHoursBetween( date ) / increment );
					case 'day'		: return ( this.getDaysBetween( date ) / increment );
					case 'week'		: return ( ( this.getDaysBetween( date ) / 7 ) / increment );
					case 'month'	: return ( this.getMonthsBetween( date ) / increment );
					case 'year'		: return ( this.getYearsBetween( date ) / increment );
				}
			}
			
			return Infinity;
		};
		
		NewDate.roundToIncrement = function( value ){
			/* Round a date/time to the nearest given value. E.g., roundToNearest( '15 mins' ) */
			
			// Make sure there is a valid value.
			if( !( typeof value == 'string' || typeof value == 'number' ) && ( value == null || value == undefined || value == false || !('toString' in value) ) ) return this.copy();
			
			// Figure out how much we actually need to increment by.
			var split		= value.split(' ');
			var increment	= Number( split[0] );
			var unit		= split[1] || 'hour';
			var timestamp	= this.getTime();
			
			if( increment !== 0 ){
				
				var rounder = 0;
				
				switch( unit.toString().replace(/s$/,'').toLowerCase() ){
					
					// Supported units for dates...
					case 'sec'		:
					case 'second' 	: rounder = 1000 * increment; break;
					case 'min'		:
					case 'minute' 	: rounder = 60000 * increment; break;
					case 'hour'		: rounder = 3600000 * increment; break;
					
					// The following cases cannot be rounded in the same way as the above,
					// and need special attention.
					case 'day' :
						
						// Round to a neat day. Adjust so that the time is at midnight instead of midday.			
						rounder = 86400000 * increment;
						return $[plugin_name].date(new Date((Math.round((timestamp+43200000)/rounder)*rounder))).addHours(-12);
					
					case 'week'		: // Round to week on sunday.
						
						// Get the weekday number. 0 Sun, 6 Sat. 
						var dayinweek	= this.getDay();
						var newdate		= null;
						
						if( dayinweek < 3 ){
							newdate = this.addDays(0-dayinweek);
						} else if( dayinweek > 3 ){
							newdate = this.addDays(7-dayinweek);
						} else {
							newdate = this.addDays( this.getHours() >= 12 ? 7-dayinweek : 0-dayinweek );
						}
						
						// round to the beginning of the new date, and return.
						newdate.setHours(0,0,0,0);
						return newdate;
					break;
					
					case 'month'	:
						// Get the first day in the month, and the halfway point.
						var firstofmonth	= $[plugin_name].date(this.format('Y-m-01 00:00:00'));
						var halfway			= firstofmonth.getDaysBetween(firstofmonth.addMonths(1)) / 2;
						
						// Check if the date we have is half way or not, and return accordingly.
						if( this.getDate() >= halfway ){
							return firstofmonth.addMonths(1);
						} else {
							return firstofmonth;
						}
					break;
					
					case 'year'		:
						// Get the first day of the year, the half way point, and the current day number.
						var firstofyear		= $[plugin_name].date(this.format('Y-01-01 00:00:00'));
						var halfway			= firstofyear.getDaysBetween(firstofyear.addYears(1)) / 2;
						var dayofyear		= firstofyear.getDaysBetween(this);
						
						// Check if the date we have is half way or not, and return accordingly.
						if( dayofyear >= halfway ){
							return firstofyear.addYears(1);
						} else {
							return firstofyear;
						}
					break;
				}
				return $[plugin_name].date(new Date((Math.round(timestamp/rounder)*rounder)));
			}
			return this;
		}
		
		return NewDate;
	};
	
	$[plugin_name].incrementsIn = function( bigger, smaller ){
		/* Returns the number of newincrements that will fit inside increment */
		var aDate = $[plugin_name].date('1970-01-01 00:00:00');
		return aDate.getIncrementBetween( aDate.incrementBy( bigger ), smaller );
	};
	
})(jQuery);