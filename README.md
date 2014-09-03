elogio.firefox
==============

Firefox addon for Elog.io

## Detector

Detector is a component responsible for picking up the images from the host (target) page, which is now displayed in the browser window. There are multiple detection options, we are now sticking to following ones: 

 * `<img>` elements, which are visible. 
    * Minimum size check shall be applied - we are not looking to attribute the images which are essentially design elements rather than separate works. 
 * `ANY ELEMENT which has background:url` since it is also a common way to display image on the web. At the same time, following limitations should be used: 
    * If the element has the background repeated, we skip it. 
    * If the element has the background offset, we skip it too. 


We should be able to modify some of the plugin's configuration. For instance: 
 * Detection: what is the size measurements of the image 
 * TBD
