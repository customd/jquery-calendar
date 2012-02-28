jQuery Calendar Plugin
======================
### By Sam Sehnert, Digital Fusion 2012

This is a [jQuery](http://jquery.com/) plugin which allows developers to implement an 
extremely flexible calendar interface with minimal up front development. The calendar 
plugin can render a Day, Week, Month and Resource calendar view.

Documentation
-------------
### Basic calendar instance

The calendar method can be used to create a calendar widget which will allow users to graphically see and optionally edit events. The calendar leaves data implementation up to the developer. Developers can feed event data to the calendar using a standard object notation.

	$('#myCalendar').cal();

The target element must be a relative or absolute positioned block level element of your choice (a ```<div />``` would be a typical choice).

You simply specify a relative or absolutely positioned parent element, and the plugin will 
generate the required HTML within that element.

	<div id="myCalendar"></div>

### Full plugin documentation

The Documentation for this plugin lives under the docs/ directory. Open it directly 
in your web browser. All resources are included (except jQuery which is loaded from a CDN).