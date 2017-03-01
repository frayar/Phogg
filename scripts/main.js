/* Function to open the data set's visualisation */
function enter(dataset) 
{
	// Compute url
	var url = "./phogg.html?dataset=" + dataset;

	// Open in url
  	var win = window.open(url, '_blank');

  	// Set focus on newly created tab
  	win.focus();
}

/* Function to display the About overlay */
openAbout = function()
{
	 	document.getElementById("about-container").style.width = "100%";
}

/* Close when someone clicks on the "x" symbol inside the overlay */
closeAbout = function()
{
	document.getElementById("about-container").style.width = "0%";
}

