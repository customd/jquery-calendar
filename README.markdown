jQuery Calendar Plugin
======================
### By Sam Sehnert, [Custom D](https://www.customd.com/) 2017

This is a [jQuery](http://jquery.com/) plugin which allows developers to implement an 
extremely flexible calendar interface with minimal up front development. The calendar 
plugin can render a Day, Week, Month and Resource calendar view.

Demos
-----

The Demos for this plugin live under the examples/ directory. Open them directly in your web browser, or view the following online example:

- [Day Calendar](https://customd.github.io/jquery-calendar/examples/day.html)
- [Week Calendar](https://customd.github.io/jquery-calendar/examples/week.html)
- [Month Calendar](https://customd.github.io/jquery-calendar/examples/month.html)
- ['Resource' Calendar](https://customd.github.io/jquery-calendar/examples/resource.html)
- [London 2012 Olympics iCalendar Feed](https://customd.github.io/jquery-calendar/examples/london-2012-ics.html)

Documentation
-------------
### Basic calendar instance

The calendar method can be used to create a calendar widget which will allow users to graphically see and optionally edit events. The calendar leaves data implementation up to the developer. Developers can feed event data to the calendar using a standard object notation.

	$('#myCalendar').cal();

The target element must be a relative or absolute positioned block level element of your choice (a ```<div />``` would be a typical choice).

You simply specify a relative or absolutely positioned parent element, and the plugin will 
generate the required HTML within that element.

	<div id="myCalendar"></div>

### Extended Date/Time powers

The calendar plugin includes its own date and time formatting methods (using [PHP style masking](http://php.net/manual/en/function.date.php)).

	$.cal.format( new Date(), 'Y-m-d H:i:s' );

You can also perform complicated date/time arithmetic using the built in date object extender (see the [full plugin documentation](https://customd.github.io/jquery-calendar/docs) for more details).

	var myDate = $.cal.date( '2012-01-01 08:00:00' );
	myDate.addHours(1.5).format('D, jS F Y, G:i a');
	
	// Returns 'Sun, 1st January 2012, 9:30 am'

### Full plugin documentation

The Documentation for this plugin lives under the docs/ directory. Open it directly 
in your web browser, or see the [online documentation](https://customd.github.io/jquery-calendar/docs).

License
-------

Copyright 2017, [Custom D](https://www.customd.com),
Released under the [MIT license](LICENSE.t)xt.
