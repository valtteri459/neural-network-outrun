//helper functions
Number.prototype.map = function (in_min, in_max, out_min, out_max) {
  return (this - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}
function closest (num, arr) {
    var curr = arr[0];
    var diff = Math.abs (num - curr);
    for (var val = 0; val < arr.length; val++) {
        var newdiff = Math.abs (num - arr[val]);
        if (newdiff < diff) {
            diff = newdiff;
            curr = arr[val];
        }
    }
    return curr;
}
function avg(a, b){
	return (a+b)/2;
}
function avgb(a, b, c){
	return (a+b+c)/3;
}
function indexOfMax(arr) {
    if (arr.length === 0) {
        return -1;
    }
    var max = arr[0];
    var maxIndex = 0;
    for (var i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            maxIndex = i;
            max = arr[i];
        }
    }
    return maxIndex;
}









//initial game coordinate and size settings
var canvasWidth = 450;
var canvasHeight = 900;
var gridSizeVertical = 20;
var gridSizeHorisontal = 10;

var blockHeight = canvasHeight/gridSizeVertical;
var blockWidth = canvasWidth/gridSizeHorisontal;
//how many last gens are shown on the history
var maxHistory = 50;




//array for storing obstacles
var falling = [];
var fitHistory = [[],[]];




//obstacles appear every X turns and the 2nd is just for counting how many rows have passed without obstacles

//this is the base rate
var obstacleEveryBase = 5;
//this will decrease when the game gets further to make objects spawn more rapidly
var obstacleEvery = obstacleEveryBase;
var noObstacle = 0;


//defines how fast the game gets harder
var moreObjectsEvery = 2000;
var increaseIntervalEvery = 4000;

//ability to skip frames for faster training
var calcsPerFrame=1;
//calculate neural network inputs
function calcInputs(player){
	//array to be returned at the end
	out = [];
	//calculate values for each column
	for(var i = 0;i<gridSizeHorisontal;i++){
		closestIndex = -1;
		for(var j = 0;j<gridSizeVertical;j++){
			if(falling[j] !== undefined)
			{
				if(falling[j][i] !== undefined && falling[j][i] == 1){
					closestIndex = j;
				}
			}
		}
		out.push(Math.max(closestIndex.map(0,gridSizeVertical-1, 0,1),0));
	}
	playerArray = new Array(gridSizeHorisontal);
	playerArray.fill(0);
	playerArray[player.location] = 1;
	out = out.concat(playerArray);
	return out;
}


//player class
function player(r,g,b){
	//set color
	this.r=r;
	this.g=g;
	this.b=b;
	//start location roughly in the middle of play area
	this.location = Math.round(gridSizeHorisontal/2)-1;
	this.distanceTraveled = 0;
	this.isDead = false;
	//ran every frame, tests if player crashed or passed
	this.executeLocation = function(skipDraw){
		obstacles = falling[gridSizeVertical-1];
		if((obstacles === undefined || obstacles[this.location] != 1) && this.isDead == false)
		{
			if(skipDraw == false){
				fill(this.r,this.g,this.b);
				rect(blockWidth*this.location, blockHeight*gridSizeVertical-blockHeight, blockWidth, blockHeight);
			}
			this.distanceTraveled++;
			return true;
		}else{
			if(this.isDead == false){
				this.isDead = true;
			}
			return false;
		}
	}
	//move player left on screen, should be done before location execute
	this.moveLeft = function(){
		if(this.isDead == false){
			if(this.location > 0){
				this.location--;
				return true;
			}else{
				return false;
			}
		}else{
			return false;
		}
	}
	//move player right on screen, should be done before location execute
	this.moveRight = function(){
		if(this.isDead == false){
			if(this.location < gridSizeHorisontal-1){
				this.location++;
				return true;
			}else{
				return false;
			}
		}else{
			return false;
		}
	}
	return this;
}


//Brainwave variables
var inputs = gridSizeHorisontal*2; //one for each column, is a float based on distance to closest obstacle on that row, 0 furthest, 1 nearest possible and one for each possible player location
var outputs = 2; //one for moving right, one for moving left
var hiddens = 3;//amount of hidden layers
var neursPerHidden = gridSizeHorisontal; //amount of neurons per hidden layer

var popSize = 50; //population size
var networks = [];//array for storing networks and associative player objects


for(var i = 0;i<popSize;i++){//populate networks
	networks.push([new Brainwave.Network(inputs, outputs, hiddens, neursPerHidden), new player(Math.floor(Math.random()*255),Math.floor(Math.random()*255),Math.floor(Math.random()*255))]);
}

//create genetics object
var genetics = new Brainwave.Genetics(popSize, networks[0][0].getNumWeights());

// When creating the genetics object it will also generate random weights an baises for the networks
// These should be imported into the population of networks before beginning any training
for (var j = 0; j < popSize; j++) {
    networks[j][0].importWeights(genetics.population[j].weights);
}


//generations ran
var genNum = 1;
//best fitness
var bestFit = 0;
var bestFitGen = 0;
var score = 0;
var alive = popSize;




//p5js setup
function setup(){
	//make canvas
	var canvas = createCanvas(450,900);
	//append canvas to it's slot
	canvas.parent(document.getElementById("gameCont"));
	//back bg
	background(0,0,0);
	//low fps, adjust to make sim faster
	frameRate(60);
	noStroke();
	document.getElementById("popSize").innerHTML = alive;
}

var frameCount = 0;
function draw(){

	//remove old elements
	background(0,0,0);
	//set fill color for falling elements
	fill(255,255,255);
	var skipDraw = false;
	for(var l = 0;l < calcsPerFrame;l++){
		//pop last one out if already max length
		if(falling.length >= gridSizeVertical){
			falling.pop();
		}
		//initialize a new row to append
		toAppend = new Array(gridSizeHorisontal);

		//only add a row of obstacles every X rows
		if(noObstacle > obstacleEvery){
			//generate more obstacles over time, but cap at width-2 to always ensure at least a small gap
			var objectAmount = Math.floor(score/moreObjectsEvery);
			if(objectAmount > gridSizeHorisontal-2){
				objectAmount = gridSizeHorisontal-2;
			}
			for(var i = 0;i<=objectAmount;i++)
			{
				toAppend[Math.round(Math.random()*gridSizeHorisontal)-1] = 1;
			}
			noObstacle = 0;
		}else{
			//increment no obstacles counter by 1
			noObstacle++;
		}
		//add new object to the falling array
		falling.unshift(toAppend);
		

		//draw obstacles
		for(var i = 0;i<falling.length;i++){
			for(var j =0;j<falling[i].length;j++){
				if(falling[i][j] == 1){
					if(skipDraw == false){
						rect(j*blockWidth,i*blockHeight, blockWidth, blockHeight);
					}
				}
				
			}
		}



		//calculate neural networks and render associative players
		//firstly check if anyone is still alive, if not do epoch
		doEpoch = true;
		for (var j = 0; j < popSize; j++) {
		    if(networks[j][1].isDead == false){
		    	doEpoch = false;
		    }
		}
		//do epoch if necessary
		if(doEpoch){
			score = 0;
			genNum++;
			//generate next generation
			genetics.epoch(genetics.population);
			fitHistory[1].push(genetics.bestFitness);
			fitHistory[0].push("generation "+(genNum-1));
			if(fitHistory.length > maxHistory){
				fitHistory[1].pop();
				fitHistory[0].pop();
			}
			//draw history

			chart.data.labels = fitHistory[0];
			chart.data.datasets[0].data = fitHistory[1];
			chart.update(0);



			if(genetics.bestFitness > bestFit){
				bestFit = genetics.bestFitness;
				bestFitGen = genNum-1;
			}


			document.getElementById("genNum").innerHTML = genNum;;
			document.getElementById("bestFit").innerHTML = bestFit;
			document.getElementById("bestFitGen").innerHTML = bestFitGen;
			for (var j = 0; j < popSize; j++) {
				//import new genes
			    networks[j][0].importWeights(genetics.population[j].weights);
			    networks[j][1] = new player(Math.floor(Math.random()*255),Math.floor(Math.random()*255),Math.floor(Math.random()*255));
			}
			alive = popSize;
			//reset falling objects on restart
			falling = [];
			obstacleEvery = obstacleEveryBase;
		}
		document.getElementById("currentScore").innerHTML = score;
		//execute every member until death
		for (var j = 0; j < popSize; j++) {
			net = networks[j][0];
			play = networks[j][1];
			inputs = calcInputs(play);
			if(play.isDead == false){
				out = net.run(inputs);
				outDir = indexOfMax(out);
				outDirVal = out[outDir];
				if(outDirVal > 0.5){
					if(outDir == 0){
						play.moveLeft();
					}else{
						play.moveRight();
					}
				}
				if(play.executeLocation(skipDraw) == false){
					alive--;
					document.getElementById("popSize").innerHTML = alive;
					genetics.population[j].fitness = play.distanceTraveled;
				}
			}
		}
		score++;
		var lowerInterval = Math.floor(score/increaseIntervalEvery);

		//ensure there's always a small gap
		if(lowerInterval > obstacleEveryBase -2)
		{
			lowerInterval = obstacleEveryBase-2;
		}
		obstacleEvery = obstacleEvery-lowerInterval;
		skipDraw = true;
	}
}

$(document).ready(function(){
	window.ctx = document.getElementById("historyGraph").getContext('2d');
	chartData = {
		labels : [],
		datasets:[{
			label: "maxFitness",
			fillColor: "rgba(220,220,220,0.2)",
            strokeColor: "rgba(220,220,220,1)",
            pointColor: "rgba(220,220,220,1)",
            pointStrokeColor: "#fff",
            pointHighlightFill: "#fff",
            pointHighlightStroke: "rgba(220,220,220,1)",
			data: []
		}]
	};
	window.chart = new Chart(ctx, {
		type:"line",
		data: chartData,
		options: {}
	});
	$("#stop").click(function(){
		noLoop();
	});
	$("#start").click(function(){
		loop();
	});
	$( "#speedSlider" ).change(function() {
    	frameRate(parseInt($(this).val()));
	});
	$( "#stepSlider" ).change(function() {
    	calcsPerFrame = parseInt($(this).val());
	});
});
