/*** Linkurious.js optimized default values ***/
// https://github.com/Linkurious/linkurious.js/wiki/Settings-by-Linkurious

/*** Object representing the application itself ***/
var myApp = angular.module('myApp', []);

/*** Controller managing the graph ***/
myApp.controller('controller', ['$scope', function($scope) {	

	// Globals
	var misclassified_file = "";
	var images_path = "";
	var graphs_path = "";
	var graph_1_prefix = "_g1_";
	var graph_2_prefix = "_g2_";
	var misclassifications = [];
	var g1_max_x = 0.0;

	/** Misclassification object**/ 
	function Misclassification(item_string)
	{
		var infos = item_string.split(';');
		this.graph_1_name = infos[0];
		this.graph_2_name = infos[1];
		this.graph_1_class = infos[2];
		this.graph_2_class = infos[3];
		this.ged_value = infos[4];
		this.ged_seqence = infos[5];
	}

	/** Sigma.js instance for graph 1 **/
	var sig = new sigma({
		graph: {nodes: [], edges: []},
		renderer: {
			container: 'graph',
			type: 'canvas'
		},
		settings: {
			drawLabels: false,
			drawEdgeLabels: false,
			doubleClickEnabled: true,
			enableEdgeHovering: true,
			edgeHoverPrecision: 1,	// default=10
			edgeHoverColor: 'edge',
			defaultEdgeHoverColor: '#000',
			edgeHoverSizeRatio: 1,
			edgeHoverExtremities: true,
			minNodeSize: 1,
			maxNodeSize: 10, 	// Large : 20
			minEdgeSize: 0.1,
			maxEdgeSize: 2,	// Large : 10
			defaultNodeColor: 'black',
			defaultEdgeColor: 'red',
			
		}
	});

	var activeState = sigma.plugins.activeState(sig);



	/** 
	 * Main
	 **/
	$scope.exploreHall = function()	
	{
		// Get the data set name (remove potential tags)
		var dataset = location.search.split('dataset=')[1];
		dataset.replace(/(<([^>]+)>)/ig,"");

		// Reassign global variables
		misclassified_file = "./data/" + dataset + "/misclassified.txt";
		images_path = "./data/" + dataset + "/images/";
		graphs_path = "./data/" + dataset + "/graphs/";

		// Load the list of misclassified graphs
		$scope.loadMisclassified(misclassified_file);
	}



	/** 
	 * Function that load and parse the misclassified file
	 **/
	$scope.loadMisclassified = function(misclassifiedURL)
	{
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.onreadystatechange = function() {
	    	if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {

	    		// Get content of the response
				var content = xmlhttp.responseText;

				// Get file lines
				var lines = content.split("\n");
		
				// Fill misclassifications array and update view
				for (var i = 0; i < lines.length; i++)
				{
					// Debug 
					//console.log(i + " :: " + lines[i]);

					// Add in the misclassification list
					var misclassification = new Misclassification(lines[i]);
					misclassifications.push(misclassification);

					// Dynamically add an misclassification items in the <ul>
					var ul = document.getElementById("misclassified-list");
  					var li = document.createElement("li");
					
  					// PROTEIN and MAO
  					var img1 = new Image(70,70); img1.src = images_path + misclassification.graph_1_name.split('.')[0] + '.png'; img1.title = misclassification.graph_1_name.split('.')[0];
  					var img2 = new Image(70,70); img2.src = images_path + misclassification.graph_2_name.split('.')[0] + '.png'; img2.title = misclassification.graph_2_name.split('.')[0];
					
					// Patch for GREC - "imageX_Y.gxl" graphname, and only one image "imageX.png" per class
					if (images_path.includes("grec"))
					{	
						img1.src = images_path + misclassification.graph_1_name.split('_')[0] + '.png';
						img2.src = images_path + misclassification.graph_2_name.split('_')[0] + '.png';
					}
						
					
					


  					var br = document.createElement("br");

					var it = i + 1;
  					li.id = "misclassification" + i;
  					li.title = "Misclassification " + it + " (" + misclassification.ged_value + ")";
  					li.appendChild(document.createTextNode(/*"[" + i + "]  " +*/ misclassification.graph_1_class + " - " + misclassification.graph_2_class));
  					li.appendChild(br);
  					li.appendChild(img1);
  					li.appendChild(img2);
  					li.addEventListener('click', function(e) { $scope.misclassificationOnClick(e.target.id); } , false);
  					ul.appendChild(li);
				}	

				// Enable "show/hide matchings edges" checkbox
				document.getElementById("matchings").disabled = false;			
	    	}
		};
		xmlhttp.open("GET", misclassifiedURL, true);
		xmlhttp.send();
	}


	/** Function that define the behaviour on a misclassification onclick event  **/
	$scope.misclassificationOnClick = function(id)
	{
		// Clear the graph
		$scope.clearGraph();

		// Reset global variables
		g1_max_x = 0.0;

		// Get selected index
		var index = parseInt(id.substring(17));

		// Hightlight selected item
		var lis = document.getElementById("misclassified-list").children;
		for (var i=0; i< lis.length; i++)
			lis[i].className = "";
		lis[index].className = "selected";

		// Load and draw graph 1
		var graph_1_url = graphs_path + misclassifications[index].graph_1_name;
		$scope.loadGXL(graph_1_url, graph_1_prefix, false);
		
		// Load and draw graph 2
		// setTimeout workaround to wait for the load of graph 1
		var graph_2_url = graphs_path + misclassifications[index].graph_2_name;
		setTimeout(function()
		{ 
			// Load and draw graph 2
			$scope.loadGXL(graph_2_url, graph_2_prefix, true); 
			
			// Draw matching
			// setTimeout workaround to wait for the load of the two graphs
			setTimeout(function(){ $scope.parseMatching(misclassifications[index].ged_seqence); $scope.display(); }, 100);
		}, 100);
		
		
		
	}

	
	/** Function that load a gxl graph  **/
	$scope.loadGXL = function(graphURL, graph_prefix, shift)
	{
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.onreadystatechange = function() {
	    	if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {

				var content = xmlhttp.responseText;

				// Read content as json graph
				var jsonGraph = $scope.gxl2json(content, graph_prefix, shift);

				// Debug
				//console.log(jsonGraph);

				// Load as sigmajs graph
				var currentGraph = JSON.parse(jsonGraph);
				sig.graph.read(currentGraph);
				
				// Init the visualisation
				$scope.init();

				// Display the graph
				if (shift)
					$scope.display();
	    	}
		};
		xmlhttp.open("GET", graphURL, true);
		xmlhttp.send();
	}

		/** 
	 * Function that convert a gxl string to json
	 **/
	$scope.gxl2json = function(gxl, graph_prefix, shift)
	{
		// Get DOM parser
		var parser = new window.DOMParser();
		var xmlDoc = parser.parseFromString(gxl, "text/xml");

		// JSON header
		var exportedGraph = "{";
		exportedGraph += "\n\t" + "\"directed\": false,";
		exportedGraph += "\n\t" + "\"graph\": [],";
		exportedGraph += "\n\t" + "\"multigraph\": false,";

		// Getting the <graph>
		var XMLnodes = xmlDoc.firstElementChild.childNodes;
		var indexOfGraph = 0;
		while ((indexOfGraph < XMLnodes.length) && (XMLnodes[indexOfGraph].nodeName != "graph"))
		{						
			indexOfGraph++;
		}
		var graphNode = XMLnodes[indexOfGraph].childNodes;

		// Getting nodes and edges
		var nodes = [];
		var edges = [];
		var i = 0;
		while ( i < graphNode.length)
		{
			if (graphNode[i].nodeName == "node")
				nodes.push(graphNode[i]);
			else if (graphNode[i].nodeName == "edge")
				edges.push(graphNode[i]);
			i++;
		}

		// Getting the informations from the nodes 
		exportedGraph = "{\n\t\"nodes\": [";
		for (i = 0 ; i < nodes.length ; i++)
		{
			if (nodes[i].nodeName == "node")
			{
				var attributes = nodes[i].attributes;
				var data = nodes[i].childNodes;

				
				
				// Getting the id of the node
				exportedGraph += "\n\t\t{\n";
				exportedGraph += "\t\t\t\"id\": \"" + graph_prefix + attributes.getNamedItem("id").value + "\",\n";

				// Getting the attributes of the node 
				var label = "";
				var attrs = "";
				var x_ = "";
				var y_ = "";
				for (j = 0 ; j < data.length; j++)
				{
					if(data[j].nodeName == "attr")
					{
						if ( data[j].attributes.getNamedItem("name").value == "x" )
						{
							x_ = data[j].firstElementChild.textContent;
							// Get the maximul x value of the first graph
							if (!shift)
								g1_max_x = Math.max(g1_max_x, parseFloat(x_));
						}
						else if ( data[j].attributes.getNamedItem("name").value == "y" )
						{
							y_ = data[j].firstElementChild.textContent;
						}
						else
						{
							exportedGraph += "\t\t\t\"" + data[j].attributes.getNamedItem("name").value + "\": \"" + data[j].firstElementChild.textContent + "\",\n";
							attrs += data[j].attributes.getNamedItem("name").value + " = " + data[j].firstElementChild.textContent + " | ";
						}
					}
				}

				// Reassign label if specified in the input file
				if (attributes.getNamedItem("label"))
					label = graph_prefix + attributes.getNamedItem("label").value;
				else
					label =  graph_prefix + attributes.getNamedItem("id").value;

				exportedGraph += "\t\t\t\"label\": \"" + attrs + "\",\n";

				// Default values (x and y coordinates, size, color,  and image representative)
				x_ = (shift) ? String(2.5*g1_max_x + 10 + parseFloat(x_)) : x_;
				exportedGraph += "\t\t\t\"x\": " + x_ + ",\n";
				exportedGraph += "\t\t\t\"y\": " + y_ + ",\n";
				exportedGraph += "\t\t\t\"size\": " + "1" + ",\n";
				var color_ = (shift)? "#0000FF" : "#000000";
				exportedGraph += "\t\t\t\"color\": \"" + color_ + "\",\n";
				exportedGraph += "\t\t\t\"representative\": \"" + "protein-structure.png" + "\"";

				// Close node
				exportedGraph += "\n\t\t},";
			}
		}
		exportedGraph = exportedGraph.substring(0, exportedGraph.length - 1);


		// Getting the informations from the edges 
		exportedGraph += "\n\t],\n\t\"edges\": [";
		var nbEdges = 0;
		for (i = 0 ; i < edges.length ; i++)
		{
			if (edges[i].nodeName == "edge")
			{
				var attributes = edges[i].attributes; 
				var data = edges[i].childNodes;
				
				exportedGraph += "\n\t\t{\n";
				exportedGraph += "\t\t\t\"id\": \"" + graph_prefix + "e" + nbEdges + "\",\n";
				exportedGraph += "\t\t\t\"label\": \"" + graph_prefix + "e" + nbEdges + "\",\n";
				exportedGraph += "\t\t\t\"source\": \"" + graph_prefix + attributes.getNamedItem("from").value + "\",\n";
				exportedGraph += "\t\t\t\"target\": \"" + graph_prefix + attributes.getNamedItem("to").value + "\",\n";
				exportedGraph += "\t\t\t\"weight\": \"1\",\n";
				exportedGraph += "\t\t\t\"color\": \"" + "#000000" + "\",\n";
				exportedGraph += "\t\t\t\"size\": \"" + "1" + "\",\n";

				// Getting the attributes of the edge
				for (j = 0 ; j < data.length ; j++)
					if(data[j].nodeName == "attr")
						exportedGraph += "\t\t\t\"" + data[j].attributes.getNamedItem("name").value + "\": \"" + data[j].firstElementChild.textContent + "\",\n";
				
				exportedGraph = exportedGraph.substring(0, exportedGraph.length - 2);
				exportedGraph += "\n\t\t},";
				
				nbEdges++;
			}
		}
		exportedGraph = exportedGraph.substring(0, exportedGraph.length - 1);
		
		// Finalizing the JSON string 
		exportedGraph += "\n\t]\n}";
		return exportedGraph;
	}
	
	/** 
	 * Function to parse a mathing string and add edges
	 **/
	$scope.parseMatching = function(content)
	{
		// Determine the color to apply to the matching edges
		var checkbox = document.getElementById("matchings");
	 	var color_ = (checkbox.checked)? "#FF0000" : "#FFFFFF";

		// Get matchings
		var matchings = content.split("/");

		// Loop on the matchings
		for (var i = 0; i < matchings.length; i++) {
			var matching = matchings[i];
			var parts = matching.split(":");
			if (parts[0] == "Node")
			{
				// Get mathing edge properties
				var elements = parts[1].split("=");
				var nodes = elements[0].split("->");
				var source = graph_1_prefix + nodes[0];
				var target = graph_2_prefix + nodes[1];
				var cost = elements[1];

				if ( (target != graph_2_prefix + "eps_id") && (source != graph_1_prefix + "eps_id") )
				{
					// Add edge
				  	sig.graph.addEdge({
						id: 'match_' + i,
						source: source,
						target: target,
						label: cost,
						size: 1.5,
						color: color_,
						//type: ['curve','dotted']
						type: 'curve'
				  	});
				}
			}
			else
			{
				// Edge
			}
		}
		$scope.checkMatchings()
	}


	/** 
	 * Function to clear the graph
	 **/
	$scope.clearGraph = function()
	{
		/* Resetting the displaying */
		sig.graph.clear();

		// Refresh the view
		sig.refresh();
	}



	/** Function to initialize the graph **/
	$scope.init = function()
	{

		/* Preprocessing each node */
		sig.graph.nodes().forEach(function(n) {

			// Set the shape of the node as square
			n.type = "square";	
			
			// Save original attributes
			n.originalColor = (n.color)? n.color : sig.settings('defaultNodeColor');
			n.originalSize = (n.size)? n.size : sig.settings('minNodeSize');
			n.originalLabel = (n.label)? n.label : "";
		});
				
		/* Preprocessing each edge*/
		sig.graph.edges().forEach(function(e) {
		
			// Save original attributes
			e.originalColor = (e.color)? e.color : sig.settings('defaultEdgeColor');
			e.originalSize = (e.size)? e.size : sig.settings('minNodeSize');
			e.originalLabel = (e.label)? e.label : "";

		});

		/* Assign an event for node onclick */
		sig.bind('clickNode', function(e) {
			$scope.selectNode(e.data.node.id);
		});


		/* Assign an event for the stage onclick */
		sig.bind('clickStage', function(e) {
			$scope.deselectNode();
		});
	};


	/** Function that display a graph that has been load by sigma **/
	$scope.display = function()
	{
		// Resetting the displaying
		sigma.misc.animation.camera(
			sig.camera, 
			{
				x: 0, 
				y: 0,
				ratio: 1
			}, 
			{duration: 1}
		);

		// Displaying the graph
		sig.refresh();
	}

	/** Function that describe the behaviour when a node is selected **/
	$scope.selectNode = function(nodeId)
	{
		var newSelectedNode;
		var newImage;

		/* Getting the node itself */
		sig.graph.nodes().forEach(function(n) {
			if (n.id == nodeId)
			{
				newSelectedNode = n;
			}
		});	

		// Deselect all nodes
		activeState.dropNodes();

		// Set the node as active
		activeState.addNodes(nodeId);
		
		// Displaying the neighbours of the node
		$scope.highlightMatchingNode(nodeId);

		// TODO: Here we could also display information on the selected note in a right panel)
	}


	/** 
	 * Function that highlight the matching node of a given node
	 **/
	$scope.highlightMatchingNode = function(nodeId)
	{
		var matchingEdge;
		var matchingNode

		// Node selected in graph1
		if (nodeId.startsWith(graph_1_prefix))
		{
			// Find relevant matching edge
			sig.graph.edges().forEach(function(e) {
				
				// A node is a neighbour if it is the source or the target of an edge connected to the current node
				if ( (e.source == nodeId) && (e.target.startsWith(graph_2_prefix)) )
				{
					matchingEdge = e;
					matchingNode = sig.graph.nodes(e.target);
				}
			});
		}
		// Node selected in graph2
		else
		{
			// Find relevant matching edge
			sig.graph.edges().forEach(function(e) {
				
				// A node is a neighbour if it is the source or the target of an edge connected to the current node
				if ( (e.target == nodeId) && (e.source.startsWith(graph_1_prefix)) )
				{
					matchingEdge = e;
					matchingNode = sig.graph.nodes(e.source);
				}

			});
		}


		/* Reset the previously selected node color */
		sig.graph.nodes().forEach(function(n) {
				n.color = n.originalColor;
		});

		/* Blank the non-neighbour edges */
		sig.graph.edges().forEach(function(e) {
			if (e.id.startsWith("match_"))
			{
				e.color = "#eeeeee";
			}
		});

		// Update elements of interest
		sig.graph.edges(matchingEdge.id).color = "black";	
		sig.graph.nodes(nodeId).color = "red";	
		sig.graph.nodes(matchingNode.id).color = "red";

		// Refresh the display
		sig.refresh();
	}

	/** Function to deselect the current node **/
	$scope.deselectNode = function()
	{
		// Set all nodes as "inactive" 
		activeState.dropNodes();

		// Reset the previously selected node color
		sig.graph.nodes().forEach(function(n) {
				n.color = n.originalColor;
		});

		// Reset the colours of edges, depending on the checkbox status
		$scope.checkMatchings();

		// Refresh the display
		sig.refresh();
	}


	/**
	 * Function that handles the behaviour when the matchings checkbox is changed
	 */
	 $scope.checkMatchings = function()
	 {
	 	// Get the checkbox eleemnt
	 	var checkbox = document.getElementById("matchings");

	 	// Determine the color to apply to the matching edges
	 	var color_ = (checkbox.checked)? "#FF0000" : "#FFFFFF";

        // Apply new color to matching edges
		sig.graph.edges().forEach(function(e) {
			if (e.id.startsWith("match_"))
				e.color = color_;
		});

		// Refresh the canvas
		sig.refresh();

	 }


	/* Function to display the About overlay */
	$scope.openAbout = function()
	{
   	 	document.getElementById("about-container").style.width = "100%";
	}

	/* Close when someone clicks on the "x" symbol inside the overlay */
	$scope.closeAbout = function()
	{
    	document.getElementById("about-container").style.width = "0%";
	}

}]);