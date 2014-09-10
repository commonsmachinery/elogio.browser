# Elog.io Firefox Plugin development notes.

## Overview
We have several components involved here. Coming from physical standpoint, here they are:

 * `lib/main.js` entry point for the extension. That's where the actual query work would happen, where the UI is setup
    for the sidebar and main logic is performed. Alos, that's where the Browser's behavior is altered.
 * `data/content-script.js` is the script injected to the page to perform manipulation with DOM and search. In this area
    we strive to use as plain javascript as possible and not load any libs to make sure we're off the version conflict.
 * `data/panel.html`, `data/panel-script.js` plus some libs - this is the sidebar content. Here we use a couple of handy
   libraries, namely bootstrap, jquery, mustache to make life easier for managing the interface.

All interrogation between these components happens via the event system - port.emit and port.on. Surely, all data coming
through these channels is to be serializable.

## Detector
Detector is a component responsible for picking up the images from the host (target) page, which is now displayed in the browser window. There are multiple detection options, we are now sticking to following ones:

 * `<img>` elements, which are visible.
    * Minimum size check shall be applied - we are not looking to attribute the images which are essentially design elements rather than separate works.
 * `ANY ELEMENT which has background:url` since it is also a common way to display image on the web. At the same time, following limitations should be used:
    * If the element has the background repeated, we skip it.
    * If the element has the background offset, we skip it too.
 * All these are filtered by the size. For now, the image has to be more than 100x100 pixels to be considered of interest.


We should be able to modify some of the plugin's configuration. For instance:
 * Detection: what is the size measurements of the image
 * TBD
