// Runs when page loads
window.onload = function() {
  // Proparation of all the context variables
  var c;
  var ctx;
  var depth;
  var segments = [];

  // Initial position to start branches from
  var startPos = {x: window.innerWidth / 2, y: 0};
  var startDir = {x: 0, y: 1};

  // On each split, set some parameters to drive vessel look
  function calculateBifurcation(l0, d0) {
    return {
      d1: d0 * (0.4 + 0.6 * Math.random()),
      d2: d0 * (0.4 + 0.6 * Math.random()),
      th1: 30 + Math.random() * 10,
      th2: 30 + Math.random() * 5,
      l1: l0 * (0.5 + 0.5 * Math.random()),
      l2: l0 * (0.5 + 0.5 * Math.random())
    }
  }

  // The L-System ruleset
  var rules = {
    F: function(n, l0, d0) {
      if (n > 0) {
        var params = calculateBifurcation(l0, d0);
        return `f(${l0},${d0})` + '[' + '+' + '(' + String(params.th1) + ')' +
          this.F(n-1, params.l1, params.d1) + ']' + '[' + '-' +
          '(' + String(params.th2) + ')' + this.F(n-1, params.l2, params.d2) +']';
      } else {
        return `f(${l0},${d0})`;
      }
    }
  };

  init();

  // Sets up a rendering context in HTML5's canvas, draws, and increses
  // recursivity depth on hitting spacebar.
  function init() {
    c = document.getElementById("canvas");
    ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    c.width = window.innerWidth;
    c.height = window.innerHeight;

    depth = 1;
    draw();

    document.body.addEventListener("keyup", function(event) {
      switch(event.keyCode) {
        case 32:
          depth += 1;
          draw();
          break;
        case 83:
          popImage();
      }
    });
  }

  // First generates the commands string, parses it, and draws the segments
  function draw() {

    // Clear canvas
    ctx.clearRect(0, 0, c.width, c.height);

    // Generate the commands string
    var result = rules.F(depth, 100.00, 7);

    // Generate the segments out of the commands
    interpret(result);

    // Iterate over segments and draw them
    segments.forEach(function(segment) {

      // A vector segment will be used for interpolating the arc drawings
      // across the branch segment
      var vector_segment = {
        x: segment.target.x - segment.origin.x,
        y: segment.target.y - segment.origin.y
      };

      // Longer segments will need more drawn circles. Different iteration count
      // will be driven by the length of the segment. The shorter segments will
      // instanciate less dots.
      var iterations = Math.sqrt(
        vector_segment.x * vector_segment.x + vector_segment.y * vector_segment.y
      );
      ctx.moveTo(segment.origin.x, segment.origin.y);
      for (i = 0; i <= iterations; i++) {

        // Linearly interpolate diameters and position of dots across the segment
        var x = segment.origin.x + (i / iterations) * vector_segment.x;
        var y = segment.origin.y + (i / iterations) * vector_segment.y;
        var diameter = segment.previous_diameter * (1 - (i / iterations)) +
          segment.diameter * (i / iterations);

        // Do the actual drawing
        ctx.beginPath();
        ctx.arc(x, y, diameter, 0, 2 * Math.PI);
        ctx.fill();
        ctx.closePath();
      }
    }); 
  }

  var currentState;
  var stateMachine;
  // Run the rules. Right now there is no axiom, you cannot run it against yet
  function interpret(commands) {

    // Reset the current segment information
    segments = [];

    // Get the character length of the string of commands for parsing purpose
    var n = commands.length;

    console.log("Commands: " + commands);
    console.log("Total length of commands string: " + n);

    // States will be pushed to the front of this array
    stateMachine = [];
    currentState = JSON.parse(JSON.stringify(
        {pos: startPos, dir: startDir}
    ));

    var i = 0;
    while (i < n) {
      var currentChar = commands.charAt(i);
      console.log("----");
      console.log("Reading: " + currentChar);
      console.log("Index:   " + i);

      switch(currentChar) {
        // Perform step on f(length, diameter), parameters are captured with]
        // regex. The returned value is used to walk passed the already parsed
        // characters.
        case 'f':
          i += perform_step(commands.slice(i, n));
          break;

        // Push a state to the start of the stack
        case '[':
          stateMachine.unshift(JSON.parse(JSON.stringify(currentState)));
          console.log(`Pushed state. Now ${stateMachine.length} states.`);
          break;

        // Pop a state from the start of the stack
        case ']':
          currentState = JSON.parse(JSON.stringify(stateMachine.shift()));
          console.log(`Popped state. Now ${stateMachine.length} states.`);
          break;

        // Clockwise rotation. The returned value makes the iterator skip the
        // parsed characters.
        case '+':
          i += turn(commands.slice(i, n), 'clockwise');
          break;

        // Counterclockwise rotation. The returned value is used to skip the 
        // iterator to the end of the parsed characters.
        case '-':
          i += turn(commands.slice(i, n), 'counterclockwise');
          break;
      }
      i += 1;
    }
  }

  // Makes turtle walk
  function perform_step(substring) {
    var pattern = /f\((\d+\.*\d*),(\d+\.*\d*)\)/;
    var result = pattern.exec(substring);

    var characters_read  = result[0].length - 1;
    var segment_length   = parseFloat(result[1]);
    var segment_diameter = parseFloat(result[2]);

    console.log("Characters Read: " + characters_read);
    console.log("Parsed length:   " + segment_length);
    console.log("Parsed diameter: " + segment_diameter);

    // Needs to be done so that we can access parent branch diameters
    currentState.diameter = segment_diameter;

    var previous_diameter;
    if (stateMachine.length < 1) {
      previous_diameter = 1.5 * segment_diameter; // root branch
    } else {
      previous_diameter = stateMachine[0].diameter;
    }

    // Pushes the segment so it can be drawn later on the draw() function
    segments.push({
      origin: {
        x: currentState.pos.x,
        y: currentState.pos.y
      },
      target: {
        x: currentState.pos.x + currentState.dir.x * segment_length,
        y: currentState.pos.y + currentState.dir.y * segment_length
      },
      diameter: segment_diameter,
      previous_diameter: previous_diameter
    })

    // Update the current position of the turtle
    currentState.pos.x += currentState.dir.x * segment_length;
    currentState.pos.y += currentState.dir.y * segment_length;

    return characters_read;
  }

  // Turns the turtle
  function turn(substring, direction) {
    var pattern = /(\+|-)\((\d+\.*\d*)\)/;
    var result = pattern.exec(substring);

    var characters_read = result[0].length - 1;
    var rotation = result[2];
    var sign = result[1];

    console.log(`Rotation: ${sign}${rotation}`);

    var radians = rotation * Math.PI / 180;
    radians = parseFloat(`${sign}${radians}`);

    var cos = Math.cos(radians);
    var sin = Math.sin(radians);

    var prevX = currentState.dir.x;
    var prevY = currentState.dir.y;

    currentState.dir.x = prevX * cos - prevY * sin;
    currentState.dir.y = prevX * sin + prevY * cos;

    return characters_read;
  }

  // Generates a png image out of the canvas
  function popImage() {
    var win = window.open("", "Canvas Image");
    var src = this.canvas.toDataURL("image/png");
    win.document.write("<img src='" + src 
      + "' width='" + this.width 
      + "' height='" + this.height + "'/>");
  }
}