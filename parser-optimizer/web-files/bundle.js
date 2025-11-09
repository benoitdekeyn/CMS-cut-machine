/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 38:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

/*global require*/
var Tableau = __webpack_require__(442);

function VariableData(index, value) {
    this.index = index;
    this.value = value;
}

//-------------------------------------------------------------------
//-------------------------------------------------------------------
Tableau.prototype.getMostFractionalVar = function () {
    var biggestFraction = 0;
    var selectedVarIndex = null;
    var selectedVarValue = null;
    var mid = 0.5;

    var integerVariables = this.model.integerVariables;
    var nIntegerVars = integerVariables.length;
    for (var v = 0; v < nIntegerVars; v++) {
        var varIndex = integerVariables[v].index;
        var varRow = this.rowByVarIndex[varIndex];
        if (varRow === -1) {
            continue;
        }

        var varValue = this.matrix[varRow][this.rhsColumn];
        var fraction = Math.abs(varValue - Math.round(varValue));
        if (biggestFraction < fraction) {
            biggestFraction = fraction;
            selectedVarIndex = varIndex;
            selectedVarValue = varValue;
        }
    }

    return new VariableData(selectedVarIndex, selectedVarValue);
};

//-------------------------------------------------------------------
//-------------------------------------------------------------------
Tableau.prototype.getFractionalVarWithLowestCost = function () {
    var highestCost = Infinity;
    var selectedVarIndex = null;
    var selectedVarValue = null;

    var integerVariables = this.model.integerVariables;
    var nIntegerVars = integerVariables.length;
    for (var v = 0; v < nIntegerVars; v++) {
        var variable = integerVariables[v];
        var varIndex = variable.index;
        var varRow = this.rowByVarIndex[varIndex];
        if (varRow === -1) {
            // Variable value is non basic
            // its value is 0
            continue;
        }

        var varValue = this.matrix[varRow][this.rhsColumn];
        if (Math.abs(varValue - Math.round(varValue)) > this.precision) {
            var cost = variable.cost;
            if (highestCost > cost) {
                highestCost = cost;
                selectedVarIndex = varIndex;
                selectedVarValue = varValue;
            }
        }
    }

    return new VariableData(selectedVarIndex, selectedVarValue);
};


/***/ }),

/***/ 61:
/***/ ((module, exports, __webpack_require__) => {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/*global describe*/
/*global require*/
/*global module*/
/*global it*/
/*global console*/
/*global process*/
/*global setTimeout*/
/*global self*/


//-------------------------------------------------------------------
// SimplexJS
// https://github.com/
// An Object-Oriented Linear Programming Solver
//
// By Justin Wolcott (c)
// Licensed under the MIT License.
//-------------------------------------------------------------------

var Tableau = __webpack_require__(871);
var Model = __webpack_require__(487);
var branchAndCut = __webpack_require__(184);
var expressions = __webpack_require__(773);
var validation = __webpack_require__(363);
var Constraint = expressions.Constraint;
var Variable = expressions.Variable;
var Numeral = expressions.Numeral;
var Term = expressions.Term;
var External = __webpack_require__(791);

// Place everything under the Solver Name Space
var Solver = function () {

    "use strict";

    this.Model = Model;
    this.branchAndCut = branchAndCut;
    this.Constraint = Constraint;
    this.Variable = Variable;
    this.Numeral = Numeral;
    this.Term = Term;
    this.Tableau = Tableau;
    this.lastSolvedModel = null;

    this.External = External;

    /*************************************************************
     * Method: Solve
     * Scope: Public:
     * Agruments:
     *        model: The model we want solver to operate on
     *        precision: If we're solving a MILP, how tight
     *                   do we want to define an integer, given
     *                   that 20.000000000000001 is not an integer.
     *                   (defaults to 1e-9)
     *            full: *get better description*
     *        validate: if left blank, it will get ignored; otherwise
     *                  it will run the model through all validation
     *                  functions in the *Validate* module
     **************************************************************/
    this.Solve = function (model, precision, full, validate) {
        //
        // Run our validations on the model
        // if the model doesn't have a validate
        // attribute set to false
        //
        if(validate){
            for(var test in validation){
                model = validation[test](model);
            }
        }

        // Make sure we at least have a model
        if (!model) {
            throw new Error("Solver requires a model to operate on");
        }

        //
        // If the objective function contains multiple objectives,
        // pass it to the multi-solver thing...
        //
        if(typeof model.optimize === "object"){
            if(Object.keys(model.optimize > 1)){
                return __webpack_require__(681)(this, model);
            }
        }

// /////////////////////////////////////////////////////////////////////
// *********************************************************************
// START
// Try our hand at handling external solvers...
// START
// *********************************************************************
// /////////////////////////////////////////////////////////////////////
        if(model.external){

            var solvers = Object.keys(External);
            solvers = JSON.stringify(solvers);
            
            //
            // The model needs to have a "solver" attribute if nothing else
            // for us to pass data into
            //
            if(!model.external.solver){
                throw new Error("The model you provided has an 'external' object that doesn't have a solver attribute. Use one of the following:" + solvers);
            }
            
            //
            // If the solver they request doesn't exist; provide them
            // with a list of possible options:
            //
            if(!External[model.external.solver]){
                throw new Error("No support (yet) for " + model.external.solver + ". Please use one of these instead:" + solvers);
            }
            
            return External[model.external.solver].solve(model);
            

// /////////////////////////////////////////////////////////////////////
// *********************************************************************
//  END
// Try our hand at handling external solvers...
//  END
// *********************************************************************
// /////////////////////////////////////////////////////////////////////

        } else {

            if (model instanceof Model === false) {
                model = new Model(precision).loadJson(model);
            }

            var solution = model.solve();
            this.lastSolvedModel = model;
            solution.solutionSet = solution.generateSolutionSet();

            // If the user asks for a full breakdown
            // of the tableau (e.g. full === true)
            // this will return it
            if (full) {
                return solution;
            } else {
                // Otherwise; give the user the bare
                // minimum of info necessary to carry on

                var store = {};

                // 1.) Add in feasibility to store;
                store.feasible = solution.feasible;

                // 2.) Add in the objective value
                store.result = solution.evaluation;

                store.bounded = solution.bounded;
                
                if(solution._tableau.__isIntegral){
                    store.isIntegral = true;
                }

                // 3.) Load all of the variable values
                Object.keys(solution.solutionSet)
                    .forEach(function (d) {
                        //
                        // When returning data in standard format,
                        // Remove all 0's
                        //
                        if(solution.solutionSet[d] !== 0){
                            store[d] = solution.solutionSet[d];
                        }
                        
                    });

                return store;
            }

        }

    };

    /*************************************************************
     * Method: ReformatLP
     * Scope: Public:
     * Agruments: model: The model we want solver to operate on
     * Purpose: Convert a friendly JSON model into a model for a
     *          real solving library...in this case
     *          lp_solver
     **************************************************************/
    this.ReformatLP = __webpack_require__(788);


     /*************************************************************
     * Method: MultiObjective
     * Scope: Public:
     * Agruments:
     *        model: The model we want solver to operate on
     *        detail: if false, or undefined; it will return the
     *                result of using the mid-point formula; otherwise
     *                it will return an object containing:
     *
     *                1. The results from the mid point formula
     *                2. The solution for each objective solved
     *                   in isolation (pareto)
     *                3. The min and max of each variable along
     *                   the frontier of the polytope (ranges)
     * Purpose: Solve a model with multiple objective functions.
     *          Since a potential infinite number of solutions exist
     *          this naively returns the mid-point between
     *
     * Note: The model has to be changed a little to work with this.
     *       Before an *opType* was required. No more. The objective
     *       attribute of the model is now an object instead of a
     *       string.
     *
     *  *EXAMPLE MODEL*
     *
     *   model = {
     *       optimize: {scotch: "max", soda: "max"},
     *       constraints: {fluid: {equal: 100}},
     *       variables: {
     *           scotch: {fluid: 1, scotch: 1},
     *           soda: {fluid: 1, soda: 1}
     *       }
     *   }
     *
     **************************************************************/
    this.MultiObjective = function(model){
        return __webpack_require__(681)(this, model);
    };
};

// var define = define || undefined;
// var window = window || undefined;

// If the project is loading through require.js, use `define` and exit
if (true) {
    !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = (function () {
        return new Solver();
    }).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
// If the project doesn't see define, but sees window, put solver on window
} else // removed by dead control flow
{}
// Ensure that its available in node.js env
module.exports = new Solver();


/***/ }),

/***/ 66:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 110:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

/*global require*/
/*global console*/
var Tableau = __webpack_require__(442);

//-------------------------------------------------------------------
//-------------------------------------------------------------------
Tableau.prototype._putInBase = function (varIndex) {
    // Is varIndex in the base?
    var r = this.rowByVarIndex[varIndex];
    if (r === -1) {
        // Outside the base
        // pivoting to take it out
        var c = this.colByVarIndex[varIndex];

        // Selecting pivot row
        // (Any row with coefficient different from 0)
        for (var r1 = 1; r1 < this.height; r1 += 1) {
            var coefficient = this.matrix[r1][c];
            if (coefficient < -this.precision || this.precision < coefficient) {
                r = r1;
                break;
            }
        }

        this.pivot(r, c);
    }

    return r;
};

Tableau.prototype._takeOutOfBase = function (varIndex) {
    // Is varIndex in the base?
    var c = this.colByVarIndex[varIndex];
    if (c === -1) {
        // Inside the base
        // pivoting to take it out
        var r = this.rowByVarIndex[varIndex];

        // Selecting pivot column
        // (Any column with coefficient different from 0)
        var pivotRow = this.matrix[r];
        for (var c1 = 1; c1 < this.height; c1 += 1) {
            var coefficient = pivotRow[c1];
            if (coefficient < -this.precision || this.precision < coefficient) {
                c = c1;
                break;
            }
        }

        this.pivot(r, c);
    }

    return c;
};

Tableau.prototype.updateVariableValues = function () {
    var nVars = this.variables.length;
    var roundingCoeff = Math.round(1 / this.precision);
    for (var v = 0; v < nVars; v += 1) {
        var variable = this.variables[v];
        var varIndex = variable.index;

        var r = this.rowByVarIndex[varIndex];
        if (r === -1) {
            // Variable is non basic
            variable.value = 0;
        } else {
            // Variable is basic
            var varValue = this.matrix[r][this.rhsColumn];
            variable.value = Math.round((varValue + Number.EPSILON) * roundingCoeff) / roundingCoeff;
        }
    }
};

Tableau.prototype.updateRightHandSide = function (constraint, difference) {
    // Updates RHS of given constraint
    var lastRow = this.height - 1;
    var constraintRow = this.rowByVarIndex[constraint.index];
    if (constraintRow === -1) {
        // Slack is not in base
        var slackColumn = this.colByVarIndex[constraint.index];

        // Upading all the RHS values
        for (var r = 0; r <= lastRow; r += 1) {
            var row = this.matrix[r];
            row[this.rhsColumn] -= difference * row[slackColumn];
        }

        var nOptionalObjectives = this.optionalObjectives.length;
        if (nOptionalObjectives > 0) {
            for (var o = 0; o < nOptionalObjectives; o += 1) {
                var reducedCosts = this.optionalObjectives[o].reducedCosts;
                reducedCosts[this.rhsColumn] -= difference * reducedCosts[slackColumn];
            }
        }
    } else {
        // Slack variable of constraint is in base
        // Updating RHS with the difference between the old and the new one
        this.matrix[constraintRow][this.rhsColumn] -= difference;
    }
};

Tableau.prototype.updateConstraintCoefficient = function (constraint, variable, difference) {
    // Updates variable coefficient within a constraint
    if (constraint.index === variable.index) {
        throw new Error("[Tableau.updateConstraintCoefficient] constraint index should not be equal to variable index !");
    }

    var r = this._putInBase(constraint.index);

    var colVar = this.colByVarIndex[variable.index];
    if (colVar === -1) {
        var rowVar = this.rowByVarIndex[variable.index];
        for (var c = 0; c < this.width; c += 1){
            this.matrix[r][c] += difference * this.matrix[rowVar][c];
        }
    } else {
        this.matrix[r][colVar] -= difference;
    }
};

Tableau.prototype.updateCost = function (variable, difference) {
    // Updates variable coefficient within the objective function
    var varIndex = variable.index;
    var lastColumn = this.width - 1;
    var varColumn = this.colByVarIndex[varIndex];
    if (varColumn === -1) {
        // Variable is in base
        var variableRow = this.matrix[this.rowByVarIndex[varIndex]];

        var c;
        if (variable.priority === 0) {
            var costRow = this.matrix[0];

            // Upading all the reduced costs
            for (c = 0; c <= lastColumn; c += 1) {
                costRow[c] += difference * variableRow[c];
            }
        } else {
            var reducedCosts = this.objectivesByPriority[variable.priority].reducedCosts;
            for (c = 0; c <= lastColumn; c += 1) {
                reducedCosts[c] += difference * variableRow[c];
            }
        }
    } else {
        // Variable is not in the base
        // Updating coefficient with difference
        this.matrix[0][varColumn] -= difference;
    }
};

Tableau.prototype.addConstraint = function (constraint) {
    // Adds a constraint to the tableau
    var sign = constraint.isUpperBound ? 1 : -1;
    var lastRow = this.height;

    var constraintRow = this.matrix[lastRow];
    if (constraintRow === undefined) {
        constraintRow = this.matrix[0].slice();
        this.matrix[lastRow] = constraintRow;
    }

    // Setting all row cells to 0
    var lastColumn = this.width - 1;
    for (var c = 0; c <= lastColumn; c += 1) {
        constraintRow[c] = 0;
    }

    // Initializing RHS
    constraintRow[this.rhsColumn] = sign * constraint.rhs;

    var terms = constraint.terms;
    var nTerms = terms.length;
    for (var t = 0; t < nTerms; t += 1) {
        var term = terms[t];
        var coefficient = term.coefficient;
        var varIndex = term.variable.index;

        var varRowIndex = this.rowByVarIndex[varIndex];
        if (varRowIndex === -1) {
            // Variable is non basic
            constraintRow[this.colByVarIndex[varIndex]] += sign * coefficient;
        } else {
            // Variable is basic
            var varRow = this.matrix[varRowIndex];
            var varValue = varRow[this.rhsColumn];
            for (c = 0; c <= lastColumn; c += 1) {
                constraintRow[c] -= sign * coefficient * varRow[c];
            }
        }
    }
    // Creating slack variable
    var slackIndex = constraint.index;
    this.varIndexByRow[lastRow] = slackIndex;
    this.rowByVarIndex[slackIndex] = lastRow;
    this.colByVarIndex[slackIndex] = -1;

    this.height += 1;
};

Tableau.prototype.removeConstraint = function (constraint) {
    var slackIndex = constraint.index;
    var lastRow = this.height - 1;

    // Putting the constraint's slack in the base
    var r = this._putInBase(slackIndex);

    // Removing constraint
    // by putting the corresponding row at the bottom of the matrix
    // and virtually reducing the height of the matrix by 1
    var tmpRow = this.matrix[lastRow];
    this.matrix[lastRow] = this.matrix[r];
    this.matrix[r] = tmpRow;

    // Removing associated slack variable from basic variables
    this.varIndexByRow[r] = this.varIndexByRow[lastRow];
    this.varIndexByRow[lastRow] = -1;
    this.rowByVarIndex[slackIndex] = -1;

    // Putting associated slack variable index in index manager
    this.availableIndexes[this.availableIndexes.length] = slackIndex;

    constraint.slack.index = -1;

    this.height -= 1;
};

Tableau.prototype.addVariable = function (variable) {
    // Adds a variable to the tableau
    // var sign = constraint.isUpperBound ? 1 : -1;

    var lastRow = this.height - 1;
    var lastColumn = this.width;
    var cost = this.model.isMinimization === true ? -variable.cost : variable.cost;
    var priority = variable.priority;

    // Setting reduced costs
    var nOptionalObjectives = this.optionalObjectives.length;
    if (nOptionalObjectives > 0) {
        for (var o = 0; o < nOptionalObjectives; o += 1) {
            this.optionalObjectives[o].reducedCosts[lastColumn] = 0;
        }
    }

    if (priority === 0) {
        this.matrix[0][lastColumn] = cost;
    } else {
        this.setOptionalObjective(priority, lastColumn, cost);
        this.matrix[0][lastColumn] = 0;
    }

    // Setting all other column cells to 0
    for (var r = 1; r <= lastRow; r += 1) {
        this.matrix[r][lastColumn] = 0;
    }

    // Adding variable to trackers
    var varIndex = variable.index;
    this.varIndexByCol[lastColumn] = varIndex;

    this.rowByVarIndex[varIndex] = -1;
    this.colByVarIndex[varIndex] = lastColumn;

    this.width += 1;
};


Tableau.prototype.removeVariable = function (variable) {
    var varIndex = variable.index;

    // Putting the variable out of the base
    var c = this._takeOutOfBase(varIndex);
    var lastColumn = this.width - 1;
    if (c !== lastColumn) {
        var lastRow = this.height - 1;
        for (var r = 0; r <= lastRow; r += 1) {
            var row = this.matrix[r];
            row[c] = row[lastColumn];
        }

        var nOptionalObjectives = this.optionalObjectives.length;
        if (nOptionalObjectives > 0) {
            for (var o = 0; o < nOptionalObjectives; o += 1) {
                var reducedCosts = this.optionalObjectives[o].reducedCosts;
                reducedCosts[c] = reducedCosts[lastColumn];
            }
        }

        var switchVarIndex = this.varIndexByCol[lastColumn];
        this.varIndexByCol[c] = switchVarIndex;
        this.colByVarIndex[switchVarIndex] = c;
    }

    // Removing variable from non basic variables
    this.varIndexByCol[lastColumn] = -1;
    this.colByVarIndex[varIndex] = -1;

    // Adding index into index manager
    this.availableIndexes[this.availableIndexes.length] = varIndex;

    variable.index = -1;

    this.width -= 1;
};


/***/ }),

/***/ 184:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

/*global describe*/
/*global require*/
/*global module*/
/*global it*/
/*global console*/
/*global process*/
var Tableau = __webpack_require__(442);

//-------------------------------------------------------------------
//-------------------------------------------------------------------
function Cut(type, varIndex, value) {
    this.type = type;
    this.varIndex = varIndex;
    this.value = value;
}

//-------------------------------------------------------------------
//-------------------------------------------------------------------
function Branch(relaxedEvaluation, cuts) {
    this.relaxedEvaluation = relaxedEvaluation;
    this.cuts = cuts;
}

//-------------------------------------------------------------------
// Branch sorting strategies
//-------------------------------------------------------------------
function sortByEvaluation(a, b) {
    return b.relaxedEvaluation - a.relaxedEvaluation;
}


//-------------------------------------------------------------------
// Applying cuts on a tableau and resolving
//-------------------------------------------------------------------
Tableau.prototype.applyCuts = function (branchingCuts){
    // Restoring initial solution
    this.restore();

    this.addCutConstraints(branchingCuts);
    this.simplex();
    // Adding MIR cuts
    if (this.model.useMIRCuts){
        var fractionalVolumeImproved = true;
        while(fractionalVolumeImproved){
            var fractionalVolumeBefore = this.computeFractionalVolume(true);
            this.applyMIRCuts();
            this.simplex();

            var fractionalVolumeAfter = this.computeFractionalVolume(true);

            // If the new fractional volume is bigger than 90% of the previous one
            // we assume there is no improvement from the MIR cuts
            if(fractionalVolumeAfter >= 0.9 * fractionalVolumeBefore){
                fractionalVolumeImproved = false;
            }
        }
    }
};

//-------------------------------------------------------------------
// Function: MILP
// Detail: Main function, my attempt at a mixed integer linear programming
//         solver
//-------------------------------------------------------------------
Tableau.prototype.branchAndCut = function () {
    var branches = [];
    var iterations = 0;
    var tolerance = this.model.tolerance;
    var toleranceFlag = true;
    var terminalTime = 1e99;
    
    //
    // Set Start Time on model...
    // Let's build out a way to *gracefully* quit
    // after {{time}} milliseconds
    //
    
    // 1.) Check to see if there's a timeout on the model
    //
    if(this.model.timeout){
        // 2.) Hooray! There is!
        //     Calculate the final date
        //
        terminalTime = Date.now() + this.model.timeout;
    }

    // This is the default result
    // If nothing is both *integral* and *feasible*
    var bestEvaluation = Infinity;
    var bestBranch = null;
    var bestOptionalObjectivesEvaluations = [];
    for (var oInit = 0; oInit < this.optionalObjectives.length; oInit += 1){
        bestOptionalObjectivesEvaluations.push(Infinity);
    }

    // And here...we...go!

    // 1.) Load a model into the queue
    var branch = new Branch(-Infinity, []);
    var acceptableThreshold;
    
    branches.push(branch);
    // If all branches have been exhausted terminate the loop
    while (branches.length > 0 && toleranceFlag === true && Date.now() < terminalTime) {
        
        if(this.model.isMinimization){
            acceptableThreshold = this.bestPossibleEval * (1 + tolerance);
        } else {
            acceptableThreshold = this.bestPossibleEval * (1 - tolerance);
        }
        
        // Abort while loop if termination tolerance is both specified and condition is met
        if (tolerance > 0) {
            if (bestEvaluation < acceptableThreshold) {
                toleranceFlag = false;
            }
        }
        
        // Get a model from the queue
        branch = branches.pop();
        if (branch.relaxedEvaluation > bestEvaluation) {
            continue;
        }

        // Solving from initial relaxed solution
        // with additional cut constraints

        // Adding cut constraints
        var cuts = branch.cuts;
        this.applyCuts(cuts);

        iterations++;
        if (this.feasible === false) {
            continue;
        }

        var evaluation = this.evaluation;
        if (evaluation > bestEvaluation) {
            // This branch does not contain the optimal solution
            continue;
        }

        // To deal with the optional objectives
        if (evaluation === bestEvaluation){
            var isCurrentEvaluationWorse = true;
            for (var o = 0; o < this.optionalObjectives.length; o += 1){
                if (this.optionalObjectives[o].reducedCosts[0] > bestOptionalObjectivesEvaluations[o]){
                    break;
                } else if (this.optionalObjectives[o].reducedCosts[0] < bestOptionalObjectivesEvaluations[o]) {
                    isCurrentEvaluationWorse = false;
                    break;
                }
            }

            if (isCurrentEvaluationWorse){
                continue;
            }
        }

        // Is the model both integral and feasible?
        if (this.isIntegral() === true) {
            
            //
            // Store the fact that we are integral
            //
            this.__isIntegral = true;
            
            
            if (iterations === 1) {
                this.branchAndCutIterations = iterations;
                return;
            }
            // Store the solution as the bestSolution
            bestBranch = branch;
            bestEvaluation = evaluation;
            for (var oCopy = 0; oCopy < this.optionalObjectives.length; oCopy += 1){
                bestOptionalObjectivesEvaluations[oCopy] = this.optionalObjectives[oCopy].reducedCosts[0];
            }
        } else {
            if (iterations === 1) {
                // Saving the first iteration
                // TODO: implement a better strategy for saving the tableau?
                this.save();
            }

            // If the solution is
            //  a. Feasible
            //  b. Better than the current solution
            //  c. but *NOT* integral

            // So the solution isn't integral? How do we solve this.
            // We create 2 new models, that are mirror images of the prior
            // model, with 1 exception.

            // Say we're trying to solve some stupid problem requiring you get
            // animals for your daughter's kindergarten petting zoo party
            // and you have to choose how many ducks, goats, and lambs to get.

            // Say that the optimal solution to this problem if we didn't have
            // to make it integral was {duck: 8, lambs: 3.5}
            //
            // To keep from traumatizing your daughter and the other children
            // you're going to want to have whole animals

            // What we would do is find the most fractional variable (lambs)
            // and create new models from the old models, but with a new constraint
            // on apples. The constraints on the low model would look like:
            // constraints: {...
            //   lamb: {max: 3}
            //   ...
            // }
            //
            // while the constraints on the high model would look like:
            //
            // constraints: {...
            //   lamb: {min: 4}
            //   ...
            // }
            // If neither of these models is feasible because of this constraint,
            // the model is not integral at this point, and fails.

            // Find out where we want to split the solution
            var variable = this.getMostFractionalVar();

            var varIndex = variable.index;

            var cutsHigh = [];
            var cutsLow = [];

            var nCuts = cuts.length;
            for (var c = 0; c < nCuts; c += 1) {
                var cut = cuts[c];
                if (cut.varIndex === varIndex) {
                    if (cut.type === "min") {
                        cutsLow.push(cut);
                    } else {
                        cutsHigh.push(cut);
                    }
                } else {
                    cutsHigh.push(cut);
                    cutsLow.push(cut);
                }
            }

            var min = Math.ceil(variable.value);
            var max = Math.floor(variable.value);

            var cutHigh = new Cut("min", varIndex, min);
            cutsHigh.push(cutHigh);

            var cutLow = new Cut("max", varIndex, max);
            cutsLow.push(cutLow);

            branches.push(new Branch(evaluation, cutsHigh));
            branches.push(new Branch(evaluation, cutsLow));

            // Sorting branches
            // Branches with the most promising lower bounds
            // will be picked first
            branches.sort(sortByEvaluation);
        }
    }

    // Adding cut constraints for the optimal solution
    if (bestBranch !== null) {
        // The model is feasible
        this.applyCuts(bestBranch.cuts);
    }
    this.branchAndCutIterations = iterations;
};


/***/ }),

/***/ 217:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

/*global require*/
/*global console*/
var Tableau = __webpack_require__(442);

//-------------------------------------------------------------------
// Description: Display a tableau matrix
//              and additional tableau information
//
//-------------------------------------------------------------------
Tableau.prototype.log = function (message, force) {
    if (false) // removed by dead control flow
{}

    console.log("****", message, "****");
    console.log("Nb Variables", this.width - 1);
    console.log("Nb Constraints", this.height - 1);
    // console.log("Variable Ids", this.variablesPerIndex);
    console.log("Basic Indexes", this.varIndexByRow);
    console.log("Non Basic Indexes", this.varIndexByCol);
    console.log("Rows", this.rowByVarIndex);
    console.log("Cols", this.colByVarIndex);

    var digitPrecision = 5;

    // Variable declaration
    var varNameRowString = "",
        spacePerColumn = [" "],
        j,
        c,
        s,
        r,
        variable,
        varIndex,
        varName,
        varNameLength,
        nSpaces,
        valueSpace,
        nameSpace;

    var row,
        rowString;

    for (c = 1; c < this.width; c += 1) {
        varIndex = this.varIndexByCol[c];
        variable = this.variablesPerIndex[varIndex];
        if (variable === undefined) {
            varName = "c" + varIndex;
        } else {
            varName = variable.id;
        }

        varNameLength = varName.length;
        nSpaces = Math.abs(varNameLength - 5);
        valueSpace = " ";
        nameSpace = "\t";

        ///////////
        /*valueSpace = " ";
        nameSpace = " ";

        for (s = 0; s < nSpaces; s += 1) {
            if (varNameLength > 5) {
                valueSpace += " ";
            } else {
                nameSpace += " ";
            }
        }*/

        ///////////
        if (varNameLength > 5) {
            valueSpace += " ";
        } else {
            nameSpace += "\t";
        }

        spacePerColumn[c] = valueSpace;

        varNameRowString += nameSpace + varName;
    }
    console.log(varNameRowString);

    var signSpace;

    // Displaying reduced costs
    var firstRow = this.matrix[this.costRowIndex];
    var firstRowString = "\t";

    ///////////
    /*for (j = 1; j < this.width; j += 1) {
        signSpace = firstRow[j] < 0 ? "" : " ";
        firstRowString += signSpace;
        firstRowString += spacePerColumn[j];
        firstRowString += firstRow[j].toFixed(2);
    }
    signSpace = firstRow[0] < 0 ? "" : " ";
    firstRowString += signSpace + spacePerColumn[0] +
        firstRow[0].toFixed(2);
    console.log(firstRowString + " Z");*/

    ///////////
    for (j = 1; j < this.width; j += 1) {
        signSpace = "\t";
        firstRowString += signSpace;
        firstRowString += spacePerColumn[j];
        firstRowString += firstRow[j].toFixed(digitPrecision);
    }
    signSpace = "\t";
    firstRowString += signSpace + spacePerColumn[0] +
        firstRow[0].toFixed(digitPrecision);
    console.log(firstRowString + "\tZ");


    // Then the basic variable rowByVarIndex
    for (r = 1; r < this.height; r += 1) {
        row = this.matrix[r];
        rowString = "\t";

        ///////////
        /*for (c = 1; c < this.width; c += 1) {
            signSpace = row[c] < 0 ? "" : " ";
            rowString += signSpace + spacePerColumn[c] + row[c].toFixed(2);
        }
        signSpace = row[0] < 0 ? "" : " ";
        rowString += signSpace + spacePerColumn[0] + row[0].toFixed(2);*/

        ///////////
        for (c = 1; c < this.width; c += 1) {
            signSpace = "\t";
            rowString += signSpace + spacePerColumn[c] + row[c].toFixed(digitPrecision);
        }
        signSpace = "\t";
        rowString += signSpace + spacePerColumn[0] + row[0].toFixed(digitPrecision);


        varIndex = this.varIndexByRow[r];
        variable = this.variablesPerIndex[varIndex];
        if (variable === undefined) {
            varName = "c" + varIndex;
        } else {
            varName = variable.id;
        }
        console.log(rowString + "\t" + varName);
    }
    console.log("");

    // Then reduced costs for optional objectives
    var nOptionalObjectives = this.optionalObjectives.length;
    if (nOptionalObjectives > 0) {
        console.log("    Optional objectives:");
        for (var o = 0; o < nOptionalObjectives; o += 1) {
            var reducedCosts = this.optionalObjectives[o].reducedCosts;
            var reducedCostsString = "";
            for (j = 1; j < this.width; j += 1) {
                signSpace = reducedCosts[j] < 0 ? "" : " ";
                reducedCostsString += signSpace;
                reducedCostsString += spacePerColumn[j];
                reducedCostsString += reducedCosts[j].toFixed(digitPrecision);
            }
            signSpace = reducedCosts[0] < 0 ? "" : " ";
            reducedCostsString += signSpace + spacePerColumn[0] +
                reducedCosts[0].toFixed(digitPrecision);
            console.log(reducedCostsString + " z" + o);
        }
    }
    console.log("Feasible?", this.feasible);
    console.log("evaluation", this.evaluation);

    return this;
};


/***/ }),

/***/ 227:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

/*global describe*/
/*global require*/
/*global it*/
/*global console*/
/*global process*/
/*global exports*/
/*global Promise*/


// LP SOLVE CLI REFERENCE:
// http://lpsolve.sourceforge.net/5.5/lp_solve.htm
//
//

// var reformat = require("./Reformat.js");

exports.reformat = __webpack_require__(788);

function clean_data(data){

    //
    // Clean Up
    // And Reformatting...
    //
    data = data.replace("\\r\\n","\r\n");


    data = data.split("\r\n");
    data = data.filter(function(x){
        
        var rx;
        
        //
        // Test 1
        rx = new RegExp(" 0$","gi");
        if(rx.test(x) === true){
            return false;
        }

        //
        // Test 2
        rx = new RegExp("\\d$","gi");
        if(rx.test(x) === false){
            return false;
        }
        

        return true;
    })
    .map(function(x){
        return x.split(/\:{0,1} +(?=\d)/);
    })
    .reduce(function(o,k,i){
        o[k[0]] = k[1];
        return o;
    },{});
    
    return data;
}





exports.solve = function(model){
    //
    return new Promise(function(res, rej){
        //
        // Exit if we're in the browser...
        //
        if(typeof window !== "undefined"){
            rej("Function Not Available in Browser");
        }
        //
        // Convert JSON model to lp_solve format
        //
        var data = __webpack_require__(788)(model);
        
        
        if(!model.external){
            rej("Data for this function must be contained in the 'external' attribute. Not seeing anything there.");
        }
        
        // 
        // In the args, they *SHALL* have provided an executable
        // path to the solver they're piping the data into
        //
        if(!model.external.binPath){
            rej("No Executable | Binary path provided in arguments as 'binPath'");
        }
        
        //
        // They also need to provide an arg_array
        //
        if(!model.external.args){
            rej("No arguments array for cli | bash provided on 'args' attribute");
        }
        
        //
        // They also need a tempName so we know where to store
        // the temp file we're creating...
        //
        if(!model.external.tempName){
            rej("No 'tempName' given. This is necessary to produce a staging file for the solver to operate on");
        }
        
        
        
        //
        // To my knowledge, in Windows, you cannot directly pipe text into
        // an exe...
        //
        // Thus, our process looks like this...
        //
        // 1.) Convert a model to something an external solver can use
        // 2.) Save the results from step 1 as a temp-text file
        // 3.) Pump the results into an exe | whatever-linux-uses
        // 4.) 
        // 
        //
        
        var fs = __webpack_require__(675);
        
        fs.writeFile(model.external.tempName, data, function(fe, fd){
            if(fe){
                rej(fe);
            } else {
                //
                // So it looks like we wrote to a file and closed it.
                // Neat.
                //
                // Now we need to execute our CLI...
                var exec = (__webpack_require__(66).execFile);
                
                //
                // Put the temp file name in the args array...
                //
                model.external.args.push(model.external.tempName);
                
                exec(model.external.binPath, model.external.args, function(e,data){
                    if(e){
                        
                        if(e.code === 1){
                            res(clean_data(data));
                        } else {
                            
                            var codes = {
                                "-2": "Out of Memory",
                                "1": "SUBOPTIMAL",
                                "2": "INFEASIBLE",
                                "3": "UNBOUNDED",
                                "4": "DEGENERATE",
                                "5": "NUMFAILURE",
                                "6": "USER-ABORT",
                                "7": "TIMEOUT",
                                "9": "PRESOLVED",
                                "25": "ACCURACY ERROR",
                                "255": "FILE-ERROR"
                            };
                            
                            var ret_obj = {
                                "code": e.code,
                                "meaning": codes[e.code],
                                "data": data
                            };
                            
                            rej(ret_obj);
                        }

                    } else {
                        // And finally...return it.
                        res(clean_data(data));
                    }
                });
            }
        });
    });
};





/*
model.external = {
    "binPath": "C:/lpsolve/lp_solve.exe",
    "tempName": "C:/temp/out.txt",
    "args": [
        "-S2"
    ]
    
}

*/

/***/ }),

/***/ 269:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

/*global require*/
var Tableau = __webpack_require__(442);

Tableau.prototype.copy = function () {
    var copy = new Tableau(this.precision);

    copy.width = this.width;
    copy.height = this.height;

    copy.nVars = this.nVars;
    copy.model = this.model;

    // Making a shallow copy of integer variable indexes
    // and variable ids
    copy.variables = this.variables;
    copy.variablesPerIndex = this.variablesPerIndex;
    copy.unrestrictedVars = this.unrestrictedVars;
    copy.lastElementIndex = this.lastElementIndex;

    // All the other arrays are deep copied
    copy.varIndexByRow = this.varIndexByRow.slice();
    copy.varIndexByCol = this.varIndexByCol.slice();

    copy.rowByVarIndex = this.rowByVarIndex.slice();
    copy.colByVarIndex = this.colByVarIndex.slice();

    copy.availableIndexes = this.availableIndexes.slice();

    var optionalObjectivesCopy = [];
    for(var o = 0; o < this.optionalObjectives.length; o++){
        optionalObjectivesCopy[o] = this.optionalObjectives[o].copy();
    }
    copy.optionalObjectives = optionalObjectivesCopy;


    var matrix = this.matrix;
    var matrixCopy = new Array(this.height);
    for (var r = 0; r < this.height; r++) {
        matrixCopy[r] = matrix[r].slice();
    }

    copy.matrix = matrixCopy;

    return copy;
};

Tableau.prototype.save = function () {
    this.savedState = this.copy();
};

Tableau.prototype.restore = function () {
    if (this.savedState === null) {
        return;
    }

    var save = this.savedState;
    var savedMatrix = save.matrix;
    this.nVars = save.nVars;
    this.model = save.model;

    // Shallow restore
    this.variables = save.variables;
    this.variablesPerIndex = save.variablesPerIndex;
    this.unrestrictedVars = save.unrestrictedVars;
    this.lastElementIndex = save.lastElementIndex;

    this.width = save.width;
    this.height = save.height;

    // Restoring matrix
    var r, c;
    for (r = 0; r < this.height; r += 1) {
        var savedRow = savedMatrix[r];
        var row = this.matrix[r];
        for (c = 0; c < this.width; c += 1) {
            row[c] = savedRow[c];
        }
    }

    // Restoring all the other structures
    var savedBasicIndexes = save.varIndexByRow;
    for (c = 0; c < this.height; c += 1) {
        this.varIndexByRow[c] = savedBasicIndexes[c];
    }

    while (this.varIndexByRow.length > this.height) {
        this.varIndexByRow.pop();
    }

    var savedNonBasicIndexes = save.varIndexByCol;
    for (r = 0; r < this.width; r += 1) {
        this.varIndexByCol[r] = savedNonBasicIndexes[r];
    }

    while (this.varIndexByCol.length > this.width) {
        this.varIndexByCol.pop();
    }

    var savedRows = save.rowByVarIndex;
    var savedCols = save.colByVarIndex;
    for (var v = 0; v < this.nVars; v += 1) {
        this.rowByVarIndex[v] = savedRows[v];
        this.colByVarIndex[v] = savedCols[v];
    }


    if (save.optionalObjectives.length > 0 && this.optionalObjectives.length > 0) {
        this.optionalObjectives = [];
        this.optionalObjectivePerPriority = {};
        for(var o = 0; o < save.optionalObjectives.length; o++){
            var optionalObjectiveCopy = save.optionalObjectives[o].copy();
            this.optionalObjectives[o] = optionalObjectiveCopy;
            this.optionalObjectivePerPriority[optionalObjectiveCopy.priority] = optionalObjectiveCopy;
        }
    }
};


/***/ }),

/***/ 304:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

/*global require*/
var Tableau = __webpack_require__(442);

Tableau.prototype.countIntegerValues = function(){
    var count = 0;
    for (var r = 1; r < this.height; r += 1) {
        if (this.variablesPerIndex[this.varIndexByRow[r]].isInteger) {
            var decimalPart = this.matrix[r][this.rhsColumn];
            decimalPart = decimalPart - Math.floor(decimalPart);
            if (decimalPart < this.precision && -decimalPart < this.precision) {
                count += 1;
            }
        }
    }

    return count;
};

//-------------------------------------------------------------------
//-------------------------------------------------------------------
Tableau.prototype.isIntegral = function () {
    var integerVariables = this.model.integerVariables;
    var nIntegerVars = integerVariables.length;
    for (var v = 0; v < nIntegerVars; v++) {
        var varRow = this.rowByVarIndex[integerVariables[v].index];
        if (varRow === -1) {
            continue;
        }

        var varValue = this.matrix[varRow][this.rhsColumn];
        if (Math.abs(varValue - Math.round(varValue)) > this.precision) {
            return false;
        }
    }
    return true;
};

// Multiply all the fractional parts of variables supposed to be integer
Tableau.prototype.computeFractionalVolume = function(ignoreIntegerValues) {
    var volume = -1;
    // var integerVariables = this.model.integerVariables;
    // var nIntegerVars = integerVariables.length;
    // for (var v = 0; v < nIntegerVars; v++) {
    //     var r = this.rowByVarIndex[integerVariables[v].index];
    //     if (r === -1) {
    //         continue;
    //     }
    //     var rhs = this.matrix[r][this.rhsColumn];
    //     rhs = Math.abs(rhs);
    //     var decimalPart = Math.min(rhs - Math.floor(rhs), Math.floor(rhs + 1));
    //     if (decimalPart < this.precision) {
    //         if (!ignoreIntegerValues) {
    //             return 0;
    //         }
    //     } else {
    //         if (volume === -1) {
    //             volume = rhs;
    //         } else {
    //             volume *= rhs;
    //         }
    //     }
    // }

    for (var r = 1; r < this.height; r += 1) {
        if (this.variablesPerIndex[this.varIndexByRow[r]].isInteger) {
            var rhs = this.matrix[r][this.rhsColumn];
            rhs = Math.abs(rhs);
            var decimalPart = Math.min(rhs - Math.floor(rhs), Math.floor(rhs + 1));
            if (decimalPart < this.precision) {
                if (!ignoreIntegerValues) {
                    return 0;
                }
            } else {
                if (volume === -1) {
                    volume = rhs;
                } else {
                    volume *= rhs;
                }
            }
        }
    }

    if (volume === -1){
        return 0;
    }
    return volume;
};


/***/ }),

/***/ 314:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

/*global require*/
var Tableau = __webpack_require__(442);
var SlackVariable = (__webpack_require__(773).SlackVariable);

Tableau.prototype.addCutConstraints = function (cutConstraints) {
    var nCutConstraints = cutConstraints.length;

    var height = this.height;
    var heightWithCuts = height + nCutConstraints;

    // Adding rows to hold cut constraints
    for (var h = height; h < heightWithCuts; h += 1) {
        if (this.matrix[h] === undefined) {
            this.matrix[h] = this.matrix[h - 1].slice();
        }
    }

    // Adding cut constraints
    this.height = heightWithCuts;
    this.nVars = this.width + this.height - 2;

    var c;
    var lastColumn = this.width - 1;
    for (var i = 0; i < nCutConstraints; i += 1) {
        var cut = cutConstraints[i];

        // Constraint row index
        var r = height + i;

        var sign = (cut.type === "min") ? -1 : 1;

        // Variable on which the cut is applied
        var varIndex = cut.varIndex;
        var varRowIndex = this.rowByVarIndex[varIndex];
        var constraintRow = this.matrix[r];
        if (varRowIndex === -1) {
            // Variable is non basic
            constraintRow[this.rhsColumn] = sign * cut.value;
            for (c = 1; c <= lastColumn; c += 1) {
                constraintRow[c] = 0;
            }
            constraintRow[this.colByVarIndex[varIndex]] = sign;
        } else {
            // Variable is basic
            var varRow = this.matrix[varRowIndex];
            var varValue = varRow[this.rhsColumn];
            constraintRow[this.rhsColumn] = sign * (cut.value - varValue);
            for (c = 1; c <= lastColumn; c += 1) {
                constraintRow[c] = -sign * varRow[c];
            }
        }

        // Creating slack variable
        var slackVarIndex = this.getNewElementIndex();
        this.varIndexByRow[r] = slackVarIndex;
        this.rowByVarIndex[slackVarIndex] = r;
        this.colByVarIndex[slackVarIndex] = -1;
        this.variablesPerIndex[slackVarIndex] = new SlackVariable("s"+slackVarIndex, slackVarIndex);
        this.nVars += 1;
    }
};

Tableau.prototype._addLowerBoundMIRCut = function(rowIndex) {

	if(rowIndex === this.costRowIndex) {
		//console.log("! IN MIR CUTS : The index of the row corresponds to the cost row. !");
		return false;
	}

	var model = this.model;
	var matrix = this.matrix;

	var intVar = this.variablesPerIndex[this.varIndexByRow[rowIndex]];
	if (!intVar.isInteger) {
		return false;
    }

	var d = matrix[rowIndex][this.rhsColumn];
	var frac_d = d - Math.floor(d);

	if (frac_d < this.precision || 1 - this.precision < frac_d) {
		return false;
    }

	//Adding a row
	var r = this.height;
	matrix[r] = matrix[r - 1].slice();
	this.height += 1;

	// Creating slack variable
	this.nVars += 1;
	var slackVarIndex = this.getNewElementIndex();
	this.varIndexByRow[r] = slackVarIndex;
	this.rowByVarIndex[slackVarIndex] = r;
	this.colByVarIndex[slackVarIndex] = -1;
	this.variablesPerIndex[slackVarIndex] = new SlackVariable("s"+slackVarIndex, slackVarIndex);

	matrix[r][this.rhsColumn] = Math.floor(d);

	for (var colIndex = 1; colIndex < this.varIndexByCol.length; colIndex += 1) {
		var variable = this.variablesPerIndex[this.varIndexByCol[colIndex]];

		if (!variable.isInteger) {
			matrix[r][colIndex] = Math.min(0, matrix[rowIndex][colIndex] / (1 - frac_d));
		} else {
			var coef = matrix[rowIndex][colIndex];
			var termCoeff = Math.floor(coef)+Math.max(0, coef - Math.floor(coef) - frac_d) / (1 - frac_d);
			matrix[r][colIndex] = termCoeff;
		}
	}

	for(var c = 0; c < this.width; c += 1) {
		matrix[r][c] -= matrix[rowIndex][c];
	}

	return true;
};

Tableau.prototype._addUpperBoundMIRCut = function(rowIndex) {

	if (rowIndex === this.costRowIndex) {
		//console.log("! IN MIR CUTS : The index of the row corresponds to the cost row. !");
		return false;
	}

	var model = this.model;
	var matrix = this.matrix;

	var intVar = this.variablesPerIndex[this.varIndexByRow[rowIndex]];
	if (!intVar.isInteger) {
		return false;
    }

	var b = matrix[rowIndex][this.rhsColumn];
	var f = b - Math.floor(b);

	if (f < this.precision || 1 - this.precision < f) {
		return false;
    }

	//Adding a row
	var r = this.height;
	matrix[r] = matrix[r - 1].slice();
	this.height += 1;

	// Creating slack variable
    
	this.nVars += 1;
	var slackVarIndex = this.getNewElementIndex();
	this.varIndexByRow[r] = slackVarIndex;
	this.rowByVarIndex[slackVarIndex] = r;
	this.colByVarIndex[slackVarIndex] = -1;
	this.variablesPerIndex[slackVarIndex] = new SlackVariable("s"+slackVarIndex, slackVarIndex);

	matrix[r][this.rhsColumn] = -f;


	for(var colIndex = 1; colIndex < this.varIndexByCol.length; colIndex += 1) {
		var variable = this.variablesPerIndex[this.varIndexByCol[colIndex]];

		var aj = matrix[rowIndex][colIndex];
		var fj = aj - Math.floor(aj);

		if(variable.isInteger) {
			if(fj <= f) {
				matrix[r][colIndex] = -fj;
            } else {
				matrix[r][colIndex] = -(1 - fj) * f / fj;
            }
		} else {
			if (aj >= 0) {
				matrix[r][colIndex] = -aj;
            } else {
				matrix[r][colIndex] = aj * f / (1 - f);
            }
		}
	}

	return true;
};


//
// THIS MAKES SOME MILP PROBLEMS PROVIDE INCORRECT
// ANSWERS...
//
// QUICK FIX: MAKE THE FUNCTION EMPTY...
//
Tableau.prototype.applyMIRCuts = function () {
    
    // var nRows = this.height;
    // for (var cst = 0; cst < nRows; cst += 1) {
    //    this._addUpperBoundMIRCut(cst);
    // }


    // // nRows = tableau.height;
    // for (cst = 0; cst < nRows; cst += 1) {
    //    this._addLowerBoundMIRCut(cst);
    // }
    
};


/***/ }),

/***/ 363:
/***/ ((__unused_webpack_module, exports) => {

/*global describe*/
/*global require*/
/*global module*/
/*global it*/
/*global console*/
/*global process*/
/*global exports*/


// All functions in this module that
// get exported to main ***MUST***
// return a functional LPSolve JSON style
// model or throw an error

exports.CleanObjectiveAttributes = function(model){
  // Test to see if the objective attribute
  // is also used by one of the constraints
  //
  // If so...create a new attribute on each
  // variable
    var fakeAttr,
        x, z;
  
    if(typeof model.optimize === "string"){
        if(model.constraints[model.optimize]){
            // Create the new attribute
            fakeAttr = Math.random();

            // Go over each variable and check
            for(x in model.variables){
                // Is it there?
                if(model.variables[x][model.optimize]){
                    model.variables[x][fakeAttr] = model.variables[x][model.optimize];
                }
            }

        // Now that we've cleaned up the variables
        // we need to clean up the constraints
            model.constraints[fakeAttr] = model.constraints[model.optimize];
            delete model.constraints[model.optimize];
            return model;
        } else {    
            return model;
        }  
    } else {
        // We're assuming its an object?
        for(z in model.optimize){
            if(model.constraints[z]){
            // Make sure that the constraint
            // being optimized isn't constrained
            // by an equity collar
                if(model.constraints[z] === "equal"){
                    // Its constrained by an equal sign;
                    // delete that objective and move on
                    delete model.optimize[z];
                
                } else {
                    // Create the new attribute
                    fakeAttr = Math.random();

                    // Go over each variable and check
                    for(x in model.variables){
                        // Is it there?
                        if(model.variables[x][z]){
                            model.variables[x][fakeAttr] = model.variables[x][z];
                        }
                    }
                // Now that we've cleaned up the variables
                // we need to clean up the constraints
                    model.constraints[fakeAttr] = model.constraints[z];
                    delete model.constraints[z];            
                }
            }    
        }
        return model;
    }
};


/***/ }),

/***/ 442:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*global describe*/
/*global require*/
/*global module*/
/*global it*/
/*global console*/
/*global process*/
var Solution = __webpack_require__(824);
var MilpSolution = __webpack_require__(746);

/*************************************************************
 * Class: Tableau
 * Description: Simplex tableau, holding a the tableau matrix
 *              and all the information necessary to perform
 *              the simplex algorithm
 * Agruments:
 *        precision: If we're solving a MILP, how tight
 *                   do we want to define an integer, given
 *                   that 20.000000000000001 is not an integer.
 *                   (defaults to 1e-8)
 **************************************************************/
function Tableau(precision) {
    this.model = null;

    this.matrix = null;
    this.width = 0;
    this.height = 0;

    this.costRowIndex = 0;
    this.rhsColumn = 0;

    this.variablesPerIndex = [];
    this.unrestrictedVars = null;

    // Solution attributes
    this.feasible = true; // until proven guilty
    this.evaluation = 0;
    this.simplexIters = 0;

    this.varIndexByRow = null;
    this.varIndexByCol = null;

    this.rowByVarIndex = null;
    this.colByVarIndex = null;

    this.precision = precision || 1e-8;

    this.optionalObjectives = [];
    this.objectivesByPriority = {};

    this.savedState = null;

    this.availableIndexes = [];
    this.lastElementIndex = 0;

    this.variables = null;
    this.nVars = 0;

    this.bounded = true;
    this.unboundedVarIndex = null;

    this.branchAndCutIterations = 0;
}
module.exports = Tableau;

Tableau.prototype.solve = function () {
    if (this.model.getNumberOfIntegerVariables() > 0) {
        this.branchAndCut();
    } else {
        this.simplex();
    }
    this.updateVariableValues();
    return this.getSolution();
};

function OptionalObjective(priority, nColumns) {
    this.priority = priority;
    this.reducedCosts = new Array(nColumns);
    for (var c = 0; c < nColumns; c += 1) {
        this.reducedCosts[c] = 0;
    }
}

OptionalObjective.prototype.copy = function () {
    var copy = new OptionalObjective(this.priority, this.reducedCosts.length);
    copy.reducedCosts = this.reducedCosts.slice();
    return copy;
};

Tableau.prototype.setOptionalObjective = function (priority, column, cost) {
    var objectiveForPriority = this.objectivesByPriority[priority];
    if (objectiveForPriority === undefined) {
        var nColumns = Math.max(this.width, column + 1);
        objectiveForPriority = new OptionalObjective(priority, nColumns);
        this.objectivesByPriority[priority] = objectiveForPriority;
        this.optionalObjectives.push(objectiveForPriority);
        this.optionalObjectives.sort(function (a, b) {
            return a.priority - b.priority;
        });
    }

    objectiveForPriority.reducedCosts[column] = cost;
};

//-------------------------------------------------------------------
//-------------------------------------------------------------------
Tableau.prototype.initialize = function (width, height, variables, unrestrictedVars) {
    this.variables = variables;
    this.unrestrictedVars = unrestrictedVars;

    this.width = width;
    this.height = height;


// console.time("tableau_build");
    // BUILD AN EMPTY ARRAY OF THAT WIDTH
    var tmpRow = new Array(width);
    for (var i = 0; i < width; i++) {
        tmpRow[i] = 0;
    }

    // BUILD AN EMPTY TABLEAU
    this.matrix = new Array(height);
    for (var j = 0; j < height; j++) {
        this.matrix[j] = tmpRow.slice();
    }

//
// TODO: Benchmark This
//this.matrix = new Array(height).fill(0).map(() => new Array(width).fill(0));

// console.timeEnd("tableau_build");
// console.log("height",height);
// console.log("width",width);
// console.log("------");
// console.log("");


    this.varIndexByRow = new Array(this.height);
    this.varIndexByCol = new Array(this.width);

    this.varIndexByRow[0] = -1;
    this.varIndexByCol[0] = -1;

    this.nVars = width + height - 2;
    this.rowByVarIndex = new Array(this.nVars);
    this.colByVarIndex = new Array(this.nVars);

    this.lastElementIndex = this.nVars;
};

Tableau.prototype._resetMatrix = function () {
    var variables = this.model.variables;
    var constraints = this.model.constraints;

    var nVars = variables.length;
    var nConstraints = constraints.length;

    var v, varIndex;
    var costRow = this.matrix[0];
    var coeff = (this.model.isMinimization === true) ? -1 : 1;
    for (v = 0; v < nVars; v += 1) {
        var variable = variables[v];
        var priority = variable.priority;
        var cost = coeff * variable.cost;
        if (priority === 0) {
            costRow[v + 1] = cost;
        } else {
            this.setOptionalObjective(priority, v + 1, cost);
        }

        varIndex = variables[v].index;
        this.rowByVarIndex[varIndex] = -1;
        this.colByVarIndex[varIndex] = v + 1;
        this.varIndexByCol[v + 1] = varIndex;
    }

    var rowIndex = 1;
    for (var c = 0; c < nConstraints; c += 1) {
        var constraint = constraints[c];

        var constraintIndex = constraint.index;
        this.rowByVarIndex[constraintIndex] = rowIndex;
        this.colByVarIndex[constraintIndex] = -1;
        this.varIndexByRow[rowIndex] = constraintIndex;

        var t, term, column;
        var terms = constraint.terms;
        var nTerms = terms.length;
        var row = this.matrix[rowIndex++];
        if (constraint.isUpperBound) {
            for (t = 0; t < nTerms; t += 1) {
                term = terms[t];
                column = this.colByVarIndex[term.variable.index];
                row[column] = term.coefficient;
            }

            row[0] = constraint.rhs;
        } else {
            for (t = 0; t < nTerms; t += 1) {
                term = terms[t];
                column = this.colByVarIndex[term.variable.index];
                row[column] = -term.coefficient;
            }

            row[0] = -constraint.rhs;
        }
    }
};

//-------------------------------------------------------------------
//-------------------------------------------------------------------
Tableau.prototype.setModel = function (model) {
    this.model = model;

    var width = model.nVariables + 1;
    var height = model.nConstraints + 1;


    this.initialize(width, height, model.variables, model.unrestrictedVariables);
    this._resetMatrix();
    return this;
};

Tableau.prototype.getNewElementIndex = function () {
    if (this.availableIndexes.length > 0) {
        return this.availableIndexes.pop();
    }

    var index = this.lastElementIndex;
    this.lastElementIndex += 1;
    return index;
};

Tableau.prototype.density = function () {
    var density = 0;

    var matrix = this.matrix;
    for (var r = 0; r < this.height; r++) {
        var row = matrix[r];
        for (var c = 0; c < this.width; c++) {
            if (row[c] !== 0) {
                density += 1;
            }
        }
    }

    return density / (this.height * this.width);
};

//-------------------------------------------------------------------
//-------------------------------------------------------------------
Tableau.prototype.setEvaluation = function () {
    // Rounding objective value
    var roundingCoeff = Math.round(1 / this.precision);
    var evaluation = this.matrix[this.costRowIndex][this.rhsColumn];
    var roundedEvaluation =
        Math.round((Number.EPSILON + evaluation) * roundingCoeff) / roundingCoeff;

    this.evaluation = roundedEvaluation;
    if (this.simplexIters === 0) {
        this.bestPossibleEval = roundedEvaluation;
    }
};

//-------------------------------------------------------------------
//-------------------------------------------------------------------
Tableau.prototype.getSolution = function () {
    var evaluation = (this.model.isMinimization === true) ?
        this.evaluation : -this.evaluation;

    if (this.model.getNumberOfIntegerVariables() > 0) {
        return new MilpSolution(this, evaluation, this.feasible, this.bounded, this.branchAndCutIterations);
    } else {
        return new Solution(this, evaluation, this.feasible, this.bounded);
    }
};


/***/ }),

/***/ 487:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*global describe*/
/*global require*/
/*global module*/
/*global it*/
/*global console*/
/*global process*/

var Tableau = __webpack_require__(442);
var branchAndCut = __webpack_require__(184);
var expressions = __webpack_require__(773);
var Constraint = expressions.Constraint;
var Equality = expressions.Equality;
var Variable = expressions.Variable;
var IntegerVariable = expressions.IntegerVariable;
var Term = expressions.Term;

/*************************************************************
 * Class: Model
 * Description: Holds the model of a linear optimisation problem
 **************************************************************/
function Model(precision, name) {
    this.tableau = new Tableau(precision);

    this.name = name;

    this.variables = [];

    this.integerVariables = [];

    this.unrestrictedVariables = {};

    this.constraints = [];

    this.nConstraints = 0;

    this.nVariables = 0;

    this.isMinimization = true;

    this.tableauInitialized = false;
    
    this.relaxationIndex = 1;

    this.useMIRCuts = false;

    this.checkForCycles = true;
    
    //
    // Quick and dirty way to leave useful information
    // for the end user without hitting the console
    // or modifying the primary return object...
    //
    this.messages = [];
}
module.exports = Model;

Model.prototype.minimize = function () {
    this.isMinimization = true;
    return this;
};

Model.prototype.maximize = function () {
    this.isMinimization = false;
    return this;
};

// Model.prototype.addConstraint = function (constraint) {
//     // TODO: make sure that the constraint does not belong do another model
//     // and make
//     this.constraints.push(constraint);
//     return this;
// };

Model.prototype._getNewElementIndex = function () {
    if (this.availableIndexes.length > 0) {
        return this.availableIndexes.pop();
    }

    var index = this.lastElementIndex;
    this.lastElementIndex += 1;
    return index;
};

Model.prototype._addConstraint = function (constraint) {
    var slackVariable = constraint.slack;
    this.tableau.variablesPerIndex[slackVariable.index] = slackVariable;
    this.constraints.push(constraint);
    this.nConstraints += 1;
    if (this.tableauInitialized === true) {
        this.tableau.addConstraint(constraint);
    }
};

Model.prototype.smallerThan = function (rhs) {
    var constraint = new Constraint(rhs, true, this.tableau.getNewElementIndex(), this);
    this._addConstraint(constraint);
    return constraint;
};

Model.prototype.greaterThan = function (rhs) {
    var constraint = new Constraint(rhs, false, this.tableau.getNewElementIndex(), this);
    this._addConstraint(constraint);
    return constraint;
};

Model.prototype.equal = function (rhs) {
    var constraintUpper = new Constraint(rhs, true, this.tableau.getNewElementIndex(), this);
    this._addConstraint(constraintUpper);

    var constraintLower = new Constraint(rhs, false, this.tableau.getNewElementIndex(), this);
    this._addConstraint(constraintLower);

    return new Equality(constraintUpper, constraintLower);
};

Model.prototype.addVariable = function (cost, id, isInteger, isUnrestricted, priority) {
    if (typeof priority === "string") {
        switch (priority) {
        case "required":
            priority = 0;
            break;
        case "strong":
            priority = 1;
            break;
        case "medium":
            priority = 2;
            break;
        case "weak":
            priority = 3;
            break;
        default:
            priority = 0;
            break;
        }
    }

    var varIndex = this.tableau.getNewElementIndex();
    if (id === null || id === undefined) {
        id = "v" + varIndex;
    }

    if (cost === null || cost === undefined) {
        cost = 0;
    }

    if (priority === null || priority === undefined) {
        priority = 0;
    }

    var variable;
    if (isInteger) {
        variable = new IntegerVariable(id, cost, varIndex, priority);
        this.integerVariables.push(variable);
    } else {
        variable = new Variable(id, cost, varIndex, priority);
    }

    this.variables.push(variable);
    this.tableau.variablesPerIndex[varIndex] = variable;

    if (isUnrestricted) {
        this.unrestrictedVariables[varIndex] = true;
    }

    this.nVariables += 1;

    if (this.tableauInitialized === true) {
        this.tableau.addVariable(variable);
    }

    return variable;
};

Model.prototype._removeConstraint = function (constraint) {
    var idx = this.constraints.indexOf(constraint);
    if (idx === -1) {
        console.warn("[Model.removeConstraint] Constraint not present in model");
        return;
    }

    this.constraints.splice(idx, 1);
    this.nConstraints -= 1;

    if (this.tableauInitialized === true) {
        this.tableau.removeConstraint(constraint);
    }

    if (constraint.relaxation) {
        this.removeVariable(constraint.relaxation);
    }
};

//-------------------------------------------------------------------
// For dynamic model modification
//-------------------------------------------------------------------
Model.prototype.removeConstraint = function (constraint) {
    if (constraint.isEquality) {
        this._removeConstraint(constraint.upperBound);
        this._removeConstraint(constraint.lowerBound);
    } else {
        this._removeConstraint(constraint);
    }

    return this;
};

Model.prototype.removeVariable = function (variable) {
    var idx = this.variables.indexOf(variable);
    if (idx === -1) {
        console.warn("[Model.removeVariable] Variable not present in model");
        return;
    }
    this.variables.splice(idx, 1);

    if (this.tableauInitialized === true) {
        this.tableau.removeVariable(variable);
    }

    return this;
};

Model.prototype.updateRightHandSide = function (constraint, difference) {
    if (this.tableauInitialized === true) {
        this.tableau.updateRightHandSide(constraint, difference);
    }
    return this;
};

Model.prototype.updateConstraintCoefficient = function (constraint, variable, difference) {
    if (this.tableauInitialized === true) {
        this.tableau.updateConstraintCoefficient(constraint, variable, difference);
    }
    return this;
};


Model.prototype.setCost = function (cost, variable) {
    var difference = cost - variable.cost;
    if (this.isMinimization === false) {
        difference = -difference;
    }

    variable.cost = cost;
    this.tableau.updateCost(variable, difference);
    return this;
};

//-------------------------------------------------------------------
//-------------------------------------------------------------------
Model.prototype.loadJson = function (jsonModel) {
    this.isMinimization = (jsonModel.opType !== "max");

    var variables = jsonModel.variables;
    var constraints = jsonModel.constraints;

    var constraintsMin = {};
    var constraintsMax = {};

    // Instantiating constraints
    var constraintIds = Object.keys(constraints);
    var nConstraintIds = constraintIds.length;

    for (var c = 0; c < nConstraintIds; c += 1) {
        var constraintId = constraintIds[c];
        var constraint = constraints[constraintId];
        var equal = constraint.equal;

        var weight = constraint.weight;
        var priority = constraint.priority;
        var relaxed = weight !== undefined || priority !== undefined;

        var lowerBound, upperBound;
        if (equal === undefined) {
            var min = constraint.min;
            if (min !== undefined) {
                lowerBound = this.greaterThan(min);
                constraintsMin[constraintId] = lowerBound;
                if (relaxed) { lowerBound.relax(weight, priority); }
            }

            var max = constraint.max;
            if (max !== undefined) {
                upperBound = this.smallerThan(max);
                constraintsMax[constraintId] = upperBound;
                if (relaxed) { upperBound.relax(weight, priority); }
            }
        } else {
            lowerBound = this.greaterThan(equal);
            constraintsMin[constraintId] = lowerBound;

            upperBound = this.smallerThan(equal);
            constraintsMax[constraintId] = upperBound;

            var equality = new Equality(lowerBound, upperBound);
            if (relaxed) { equality.relax(weight, priority); }
        }
    }

    var variableIds = Object.keys(variables);
    var nVariables = variableIds.length;
    
    
    
//
//
// *** OPTIONS ***
//
//

    this.tolerance = jsonModel.tolerance || 0;
    
    if(jsonModel.timeout){
        this.timeout = jsonModel.timeout;
    }
    
    //
    //
    // The model is getting too sloppy with options added to it...
    // mebe it needs an "options" option...?
    //
    // YES! IT DOES!
    // DO IT!
    // NOW!
    // HERE!!!
    //
    if(jsonModel.options){
        
        //
        // TIMEOUT
        //
        if(jsonModel.options.timeout){
            this.timeout = jsonModel.options.timeout;
        }
        
        //
        // TOLERANCE
        //
        if(this.tolerance === 0){
            this.tolerance = jsonModel.options.tolerance || 0;
        }
        
        //
        // MIR CUTS - (NOT WORKING)
        //
        if(jsonModel.options.useMIRCuts){
            this.useMIRCuts = jsonModel.options.useMIRCuts;
        }
        
        //
        // CYCLE CHECK...tricky because it defaults to false
        //
        //
        // This should maybe be on by default...
        //
        if(typeof jsonModel.options.exitOnCycles === "undefined"){
            this.checkForCycles = true;
        } else {
            this.checkForCycles = jsonModel.options.exitOnCycles;
        }

        
    }
    
    
//
//
// /// OPTIONS \\\
//
//
    
    var integerVarIds = jsonModel.ints || {};
    var binaryVarIds = jsonModel.binaries || {};
    var unrestrictedVarIds = jsonModel.unrestricted || {};

    // Instantiating variables and constraint terms
    var objectiveName = jsonModel.optimize;
    for (var v = 0; v < nVariables; v += 1) {
        // Creation of the variables
        var variableId = variableIds[v];
        var variableConstraints = variables[variableId];
        var cost = variableConstraints[objectiveName] || 0;
        var isBinary = !!binaryVarIds[variableId];
        var isInteger = !!integerVarIds[variableId] || isBinary;
        var isUnrestricted = !!unrestrictedVarIds[variableId];
        var variable = this.addVariable(cost, variableId, isInteger, isUnrestricted);

        if (isBinary) {
            // Creating an upperbound constraint for this variable
            this.smallerThan(1).addTerm(1, variable);
        }

        var constraintNames = Object.keys(variableConstraints);
        for (c = 0; c < constraintNames.length; c += 1) {
            var constraintName = constraintNames[c];
            if (constraintName === objectiveName) {
                continue;
            }

            var coefficient = variableConstraints[constraintName];

            var constraintMin = constraintsMin[constraintName];
            if (constraintMin !== undefined) {
                constraintMin.addTerm(coefficient, variable);
            }

            var constraintMax = constraintsMax[constraintName];
            if (constraintMax !== undefined) {
                constraintMax.addTerm(coefficient, variable);
            }
        }
    }

    return this;
};

//-------------------------------------------------------------------
//-------------------------------------------------------------------
Model.prototype.getNumberOfIntegerVariables = function () {
    return this.integerVariables.length;
};

Model.prototype.solve = function () {
    // Setting tableau if not done
    if (this.tableauInitialized === false) {
        this.tableau.setModel(this);
        this.tableauInitialized = true;
    }

    return this.tableau.solve();
};

Model.prototype.isFeasible = function () {
    return this.tableau.feasible;
};

Model.prototype.save = function () {
    return this.tableau.save();
};

Model.prototype.restore = function () {
    return this.tableau.restore();
};

Model.prototype.activateMIRCuts = function (useMIRCuts) {
    this.useMIRCuts = useMIRCuts;
};

Model.prototype.debug = function (debugCheckForCycles) {
    this.checkForCycles = debugCheckForCycles;
};

Model.prototype.log = function (message) {
    return this.tableau.log(message);
};


/***/ }),

/***/ 675:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 681:
/***/ ((module) => {

/*global describe*/
/*global require*/
/*global module*/
/*global it*/
/*global console*/
/*global process*/

    /***************************************************************
     * Method: polyopt
     * Scope: private
     * Agruments:
     *        model: The model we want solver to operate on.
                     Because we're in here, we're assuming that
                     we're solving a multi-objective optimization
                     problem. Poly-Optimization. polyopt.

                     This model has to be formed a little differently
                     because it has multiple objective functions.
                     Normally, a model has 2 attributes: opType (string,
                     "max" or "min"), and optimize (string, whatever
                     attribute we're optimizing.

                     Now, there is no opType attribute on the model,
                     and optimize is an object of attributes to be
                     optimized, and how they're to be optimized.
                     For example:

                     ...
                     "optimize": {
                        "pancakes": "max",
                        "cost": "minimize"
                     }
                     ...


     **************************************************************/

module.exports = function(solver, model){

    // I have no idea if this is actually works, or what,
    // but here is my algorithm to solve linear programs
    // with multiple objective functions

    // 1. Optimize for each constraint
    // 2. The results for each solution is a vector
    //    representing a vertex on the polytope we're creating
    // 3. The results for all solutions describes the shape
    //    of the polytope (would be nice to have the equation
    //    representing this)
    // 4. Find the mid-point between all vertices by doing the
    //    following (a_1 + a_2 ... a_n) / n;
    var objectives = model.optimize,
        new_constraints = JSON.parse(JSON.stringify(model.optimize)),
        keys = Object.keys(model.optimize),
        tmp,
        counter = 0,
        vectors = {},
        vector_key = "",
        obj = {},
        pareto = [],
        i,j,x,y,z;

    // Delete the optimize object from the model
    delete model.optimize;

    // Iterate and Clear
    for(i = 0; i < keys.length; i++){
        // Clean up the new_constraints
        new_constraints[keys[i]] = 0;
    }

    // Solve and add
    for(i = 0; i < keys.length; i++){

        // Prep the model
        model.optimize = keys[i];
        model.opType = objectives[keys[i]];

        // solve the model
        tmp = solver.Solve(model, undefined, undefined, true);

        // Only the variables make it into the solution;
        // not the attributes.
        //
        // Because of this, we have to add the attributes
        // back onto the solution so we can do math with
        // them later...

        // Loop over the keys
        for(y in keys){
            // We're only worried about attributes, not variables
            if(!model.variables[keys[y]]){
                // Create space for the attribute in the tmp object
                tmp[keys[y]] = tmp[keys[y]] ? tmp[keys[y]] : 0;
                // Go over each of the variables
                for(x in model.variables){
                    // Does the variable exist in tmp *and* does attribute exist in this model?
                    if(model.variables[x][keys[y]] && tmp[x]){
                        // Add it to tmp
                        tmp[keys[y]] += tmp[x] * model.variables[x][keys[y]];
                    }
                }
            }
        }

        // clear our key
        vector_key = "base";
        // this makes sure that if we get
        // the same vector more than once,
        // we only count it once when finding
        // the midpoint
        for(j = 0; j < keys.length; j++){
            if(tmp[keys[j]]){
                vector_key += "-" + ((tmp[keys[j]] * 1000) | 0) / 1000;
            } else {
                vector_key += "-0";
            }
        }

        // Check here to ensure it doesn't exist
        if(!vectors[vector_key]){
            // Add the vector-key in
            vectors[vector_key] = 1;
            counter++;
            
            // Iterate over the keys
            // and update our new constraints
            for(j = 0; j < keys.length; j++){
                if(tmp[keys[j]]){
                    new_constraints[keys[j]] += tmp[keys[j]];
                }
            }
            
            // Push the solution into the paretos
            // array after cleaning it of some
            // excess data markers
            
            delete tmp.feasible;
            delete tmp.result;            
            pareto.push(tmp);
        }
    }

    // Trying to find the mid-point
    // divide each constraint by the
    // number of constraints
    // *midpoint formula*
    // (x1 + x2 + x3) / 3
    for(i = 0; i < keys.length; i++){
        model.constraints[keys[i]] = {"equal": new_constraints[keys[i]] / counter};
    }

    // Give the model a fake thing to optimize on
    model.optimize = "cheater-" + Math.random();
    model.opType = "max";

    // And add the fake attribute to the variables
    // in the model
    for(i in model.variables){
        model.variables[i].cheater = 1;
    }
    
    // Build out the object with all attributes
    for(i in pareto){
        for(x in pareto[i]){
            obj[x] = obj[x] || {min: 1e99, max: -1e99};
        }
    }
    
    // Give each pareto a full attribute list
    // while getting the max and min values
    // for each attribute
    for(i in obj){
        for(x in pareto){
            if(pareto[x][i]){
                if(pareto[x][i] > obj[i].max){
                    obj[i].max = pareto[x][i];
                } 
                if(pareto[x][i] < obj[i].min){
                    obj[i].min = pareto[x][i];
                }
            } else {
                pareto[x][i] = 0;
                obj[i].min = 0;
            }
        }
    }
    // Solve the model for the midpoints
    tmp =  solver.Solve(model, undefined, undefined, true);
    
    return {
        midpoint: tmp,
        vertices: pareto,
        ranges: obj
    };    

};


/***/ }),

/***/ 710:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*!

JSZip v3.10.1 - A JavaScript class for generating and reading zip files
<http://stuartk.com/jszip>

(c) 2009-2016 Stuart Knightley <stuart [at] stuartk.com>
Dual licenced under the MIT license or GPLv3. See https://raw.github.com/Stuk/jszip/main/LICENSE.markdown.

JSZip uses the library pako released under the MIT license :
https://github.com/nodeca/pako/blob/main/LICENSE
*/

!function(e){if(true)module.exports=e();else // removed by dead control flow
{}}(function(){return function s(a,o,h){function u(r,e){if(!o[r]){if(!a[r]){var t=undefined;if(!e&&t)return require(r,!0);if(l)return l(r,!0);var n=new Error("Cannot find module '"+r+"'");throw n.code="MODULE_NOT_FOUND",n}var i=o[r]={exports:{}};a[r][0].call(i.exports,function(e){var t=a[r][1][e];return u(t||e)},i,i.exports,s,a,o,h)}return o[r].exports}for(var l=undefined,e=0;e<h.length;e++)u(h[e]);return u}({1:[function(e,t,r){"use strict";var d=e("./utils"),c=e("./support"),p="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";r.encode=function(e){for(var t,r,n,i,s,a,o,h=[],u=0,l=e.length,f=l,c="string"!==d.getTypeOf(e);u<e.length;)f=l-u,n=c?(t=e[u++],r=u<l?e[u++]:0,u<l?e[u++]:0):(t=e.charCodeAt(u++),r=u<l?e.charCodeAt(u++):0,u<l?e.charCodeAt(u++):0),i=t>>2,s=(3&t)<<4|r>>4,a=1<f?(15&r)<<2|n>>6:64,o=2<f?63&n:64,h.push(p.charAt(i)+p.charAt(s)+p.charAt(a)+p.charAt(o));return h.join("")},r.decode=function(e){var t,r,n,i,s,a,o=0,h=0,u="data:";if(e.substr(0,u.length)===u)throw new Error("Invalid base64 input, it looks like a data url.");var l,f=3*(e=e.replace(/[^A-Za-z0-9+/=]/g,"")).length/4;if(e.charAt(e.length-1)===p.charAt(64)&&f--,e.charAt(e.length-2)===p.charAt(64)&&f--,f%1!=0)throw new Error("Invalid base64 input, bad content length.");for(l=c.uint8array?new Uint8Array(0|f):new Array(0|f);o<e.length;)t=p.indexOf(e.charAt(o++))<<2|(i=p.indexOf(e.charAt(o++)))>>4,r=(15&i)<<4|(s=p.indexOf(e.charAt(o++)))>>2,n=(3&s)<<6|(a=p.indexOf(e.charAt(o++))),l[h++]=t,64!==s&&(l[h++]=r),64!==a&&(l[h++]=n);return l}},{"./support":30,"./utils":32}],2:[function(e,t,r){"use strict";var n=e("./external"),i=e("./stream/DataWorker"),s=e("./stream/Crc32Probe"),a=e("./stream/DataLengthProbe");function o(e,t,r,n,i){this.compressedSize=e,this.uncompressedSize=t,this.crc32=r,this.compression=n,this.compressedContent=i}o.prototype={getContentWorker:function(){var e=new i(n.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new a("data_length")),t=this;return e.on("end",function(){if(this.streamInfo.data_length!==t.uncompressedSize)throw new Error("Bug : uncompressed data size mismatch")}),e},getCompressedWorker:function(){return new i(n.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize",this.compressedSize).withStreamInfo("uncompressedSize",this.uncompressedSize).withStreamInfo("crc32",this.crc32).withStreamInfo("compression",this.compression)}},o.createWorkerFrom=function(e,t,r){return e.pipe(new s).pipe(new a("uncompressedSize")).pipe(t.compressWorker(r)).pipe(new a("compressedSize")).withStreamInfo("compression",t)},t.exports=o},{"./external":6,"./stream/Crc32Probe":25,"./stream/DataLengthProbe":26,"./stream/DataWorker":27}],3:[function(e,t,r){"use strict";var n=e("./stream/GenericWorker");r.STORE={magic:"\0\0",compressWorker:function(){return new n("STORE compression")},uncompressWorker:function(){return new n("STORE decompression")}},r.DEFLATE=e("./flate")},{"./flate":7,"./stream/GenericWorker":28}],4:[function(e,t,r){"use strict";var n=e("./utils");var o=function(){for(var e,t=[],r=0;r<256;r++){e=r;for(var n=0;n<8;n++)e=1&e?3988292384^e>>>1:e>>>1;t[r]=e}return t}();t.exports=function(e,t){return void 0!==e&&e.length?"string"!==n.getTypeOf(e)?function(e,t,r,n){var i=o,s=n+r;e^=-1;for(var a=n;a<s;a++)e=e>>>8^i[255&(e^t[a])];return-1^e}(0|t,e,e.length,0):function(e,t,r,n){var i=o,s=n+r;e^=-1;for(var a=n;a<s;a++)e=e>>>8^i[255&(e^t.charCodeAt(a))];return-1^e}(0|t,e,e.length,0):0}},{"./utils":32}],5:[function(e,t,r){"use strict";r.base64=!1,r.binary=!1,r.dir=!1,r.createFolders=!0,r.date=null,r.compression=null,r.compressionOptions=null,r.comment=null,r.unixPermissions=null,r.dosPermissions=null},{}],6:[function(e,t,r){"use strict";var n=null;n="undefined"!=typeof Promise?Promise:e("lie"),t.exports={Promise:n}},{lie:37}],7:[function(e,t,r){"use strict";var n="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Uint32Array,i=e("pako"),s=e("./utils"),a=e("./stream/GenericWorker"),o=n?"uint8array":"array";function h(e,t){a.call(this,"FlateWorker/"+e),this._pako=null,this._pakoAction=e,this._pakoOptions=t,this.meta={}}r.magic="\b\0",s.inherits(h,a),h.prototype.processChunk=function(e){this.meta=e.meta,null===this._pako&&this._createPako(),this._pako.push(s.transformTo(o,e.data),!1)},h.prototype.flush=function(){a.prototype.flush.call(this),null===this._pako&&this._createPako(),this._pako.push([],!0)},h.prototype.cleanUp=function(){a.prototype.cleanUp.call(this),this._pako=null},h.prototype._createPako=function(){this._pako=new i[this._pakoAction]({raw:!0,level:this._pakoOptions.level||-1});var t=this;this._pako.onData=function(e){t.push({data:e,meta:t.meta})}},r.compressWorker=function(e){return new h("Deflate",e)},r.uncompressWorker=function(){return new h("Inflate",{})}},{"./stream/GenericWorker":28,"./utils":32,pako:38}],8:[function(e,t,r){"use strict";function A(e,t){var r,n="";for(r=0;r<t;r++)n+=String.fromCharCode(255&e),e>>>=8;return n}function n(e,t,r,n,i,s){var a,o,h=e.file,u=e.compression,l=s!==O.utf8encode,f=I.transformTo("string",s(h.name)),c=I.transformTo("string",O.utf8encode(h.name)),d=h.comment,p=I.transformTo("string",s(d)),m=I.transformTo("string",O.utf8encode(d)),_=c.length!==h.name.length,g=m.length!==d.length,b="",v="",y="",w=h.dir,k=h.date,x={crc32:0,compressedSize:0,uncompressedSize:0};t&&!r||(x.crc32=e.crc32,x.compressedSize=e.compressedSize,x.uncompressedSize=e.uncompressedSize);var S=0;t&&(S|=8),l||!_&&!g||(S|=2048);var z=0,C=0;w&&(z|=16),"UNIX"===i?(C=798,z|=function(e,t){var r=e;return e||(r=t?16893:33204),(65535&r)<<16}(h.unixPermissions,w)):(C=20,z|=function(e){return 63&(e||0)}(h.dosPermissions)),a=k.getUTCHours(),a<<=6,a|=k.getUTCMinutes(),a<<=5,a|=k.getUTCSeconds()/2,o=k.getUTCFullYear()-1980,o<<=4,o|=k.getUTCMonth()+1,o<<=5,o|=k.getUTCDate(),_&&(v=A(1,1)+A(B(f),4)+c,b+="up"+A(v.length,2)+v),g&&(y=A(1,1)+A(B(p),4)+m,b+="uc"+A(y.length,2)+y);var E="";return E+="\n\0",E+=A(S,2),E+=u.magic,E+=A(a,2),E+=A(o,2),E+=A(x.crc32,4),E+=A(x.compressedSize,4),E+=A(x.uncompressedSize,4),E+=A(f.length,2),E+=A(b.length,2),{fileRecord:R.LOCAL_FILE_HEADER+E+f+b,dirRecord:R.CENTRAL_FILE_HEADER+A(C,2)+E+A(p.length,2)+"\0\0\0\0"+A(z,4)+A(n,4)+f+b+p}}var I=e("../utils"),i=e("../stream/GenericWorker"),O=e("../utf8"),B=e("../crc32"),R=e("../signature");function s(e,t,r,n){i.call(this,"ZipFileWorker"),this.bytesWritten=0,this.zipComment=t,this.zipPlatform=r,this.encodeFileName=n,this.streamFiles=e,this.accumulate=!1,this.contentBuffer=[],this.dirRecords=[],this.currentSourceOffset=0,this.entriesCount=0,this.currentFile=null,this._sources=[]}I.inherits(s,i),s.prototype.push=function(e){var t=e.meta.percent||0,r=this.entriesCount,n=this._sources.length;this.accumulate?this.contentBuffer.push(e):(this.bytesWritten+=e.data.length,i.prototype.push.call(this,{data:e.data,meta:{currentFile:this.currentFile,percent:r?(t+100*(r-n-1))/r:100}}))},s.prototype.openedSource=function(e){this.currentSourceOffset=this.bytesWritten,this.currentFile=e.file.name;var t=this.streamFiles&&!e.file.dir;if(t){var r=n(e,t,!1,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);this.push({data:r.fileRecord,meta:{percent:0}})}else this.accumulate=!0},s.prototype.closedSource=function(e){this.accumulate=!1;var t=this.streamFiles&&!e.file.dir,r=n(e,t,!0,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);if(this.dirRecords.push(r.dirRecord),t)this.push({data:function(e){return R.DATA_DESCRIPTOR+A(e.crc32,4)+A(e.compressedSize,4)+A(e.uncompressedSize,4)}(e),meta:{percent:100}});else for(this.push({data:r.fileRecord,meta:{percent:0}});this.contentBuffer.length;)this.push(this.contentBuffer.shift());this.currentFile=null},s.prototype.flush=function(){for(var e=this.bytesWritten,t=0;t<this.dirRecords.length;t++)this.push({data:this.dirRecords[t],meta:{percent:100}});var r=this.bytesWritten-e,n=function(e,t,r,n,i){var s=I.transformTo("string",i(n));return R.CENTRAL_DIRECTORY_END+"\0\0\0\0"+A(e,2)+A(e,2)+A(t,4)+A(r,4)+A(s.length,2)+s}(this.dirRecords.length,r,e,this.zipComment,this.encodeFileName);this.push({data:n,meta:{percent:100}})},s.prototype.prepareNextSource=function(){this.previous=this._sources.shift(),this.openedSource(this.previous.streamInfo),this.isPaused?this.previous.pause():this.previous.resume()},s.prototype.registerPrevious=function(e){this._sources.push(e);var t=this;return e.on("data",function(e){t.processChunk(e)}),e.on("end",function(){t.closedSource(t.previous.streamInfo),t._sources.length?t.prepareNextSource():t.end()}),e.on("error",function(e){t.error(e)}),this},s.prototype.resume=function(){return!!i.prototype.resume.call(this)&&(!this.previous&&this._sources.length?(this.prepareNextSource(),!0):this.previous||this._sources.length||this.generatedError?void 0:(this.end(),!0))},s.prototype.error=function(e){var t=this._sources;if(!i.prototype.error.call(this,e))return!1;for(var r=0;r<t.length;r++)try{t[r].error(e)}catch(e){}return!0},s.prototype.lock=function(){i.prototype.lock.call(this);for(var e=this._sources,t=0;t<e.length;t++)e[t].lock()},t.exports=s},{"../crc32":4,"../signature":23,"../stream/GenericWorker":28,"../utf8":31,"../utils":32}],9:[function(e,t,r){"use strict";var u=e("../compressions"),n=e("./ZipFileWorker");r.generateWorker=function(e,a,t){var o=new n(a.streamFiles,t,a.platform,a.encodeFileName),h=0;try{e.forEach(function(e,t){h++;var r=function(e,t){var r=e||t,n=u[r];if(!n)throw new Error(r+" is not a valid compression method !");return n}(t.options.compression,a.compression),n=t.options.compressionOptions||a.compressionOptions||{},i=t.dir,s=t.date;t._compressWorker(r,n).withStreamInfo("file",{name:e,dir:i,date:s,comment:t.comment||"",unixPermissions:t.unixPermissions,dosPermissions:t.dosPermissions}).pipe(o)}),o.entriesCount=h}catch(e){o.error(e)}return o}},{"../compressions":3,"./ZipFileWorker":8}],10:[function(e,t,r){"use strict";function n(){if(!(this instanceof n))return new n;if(arguments.length)throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");this.files=Object.create(null),this.comment=null,this.root="",this.clone=function(){var e=new n;for(var t in this)"function"!=typeof this[t]&&(e[t]=this[t]);return e}}(n.prototype=e("./object")).loadAsync=e("./load"),n.support=e("./support"),n.defaults=e("./defaults"),n.version="3.10.1",n.loadAsync=function(e,t){return(new n).loadAsync(e,t)},n.external=e("./external"),t.exports=n},{"./defaults":5,"./external":6,"./load":11,"./object":15,"./support":30}],11:[function(e,t,r){"use strict";var u=e("./utils"),i=e("./external"),n=e("./utf8"),s=e("./zipEntries"),a=e("./stream/Crc32Probe"),l=e("./nodejsUtils");function f(n){return new i.Promise(function(e,t){var r=n.decompressed.getContentWorker().pipe(new a);r.on("error",function(e){t(e)}).on("end",function(){r.streamInfo.crc32!==n.decompressed.crc32?t(new Error("Corrupted zip : CRC32 mismatch")):e()}).resume()})}t.exports=function(e,o){var h=this;return o=u.extend(o||{},{base64:!1,checkCRC32:!1,optimizedBinaryString:!1,createFolders:!1,decodeFileName:n.utf8decode}),l.isNode&&l.isStream(e)?i.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file.")):u.prepareContent("the loaded zip file",e,!0,o.optimizedBinaryString,o.base64).then(function(e){var t=new s(o);return t.load(e),t}).then(function(e){var t=[i.Promise.resolve(e)],r=e.files;if(o.checkCRC32)for(var n=0;n<r.length;n++)t.push(f(r[n]));return i.Promise.all(t)}).then(function(e){for(var t=e.shift(),r=t.files,n=0;n<r.length;n++){var i=r[n],s=i.fileNameStr,a=u.resolve(i.fileNameStr);h.file(a,i.decompressed,{binary:!0,optimizedBinaryString:!0,date:i.date,dir:i.dir,comment:i.fileCommentStr.length?i.fileCommentStr:null,unixPermissions:i.unixPermissions,dosPermissions:i.dosPermissions,createFolders:o.createFolders}),i.dir||(h.file(a).unsafeOriginalName=s)}return t.zipComment.length&&(h.comment=t.zipComment),h})}},{"./external":6,"./nodejsUtils":14,"./stream/Crc32Probe":25,"./utf8":31,"./utils":32,"./zipEntries":33}],12:[function(e,t,r){"use strict";var n=e("../utils"),i=e("../stream/GenericWorker");function s(e,t){i.call(this,"Nodejs stream input adapter for "+e),this._upstreamEnded=!1,this._bindStream(t)}n.inherits(s,i),s.prototype._bindStream=function(e){var t=this;(this._stream=e).pause(),e.on("data",function(e){t.push({data:e,meta:{percent:0}})}).on("error",function(e){t.isPaused?this.generatedError=e:t.error(e)}).on("end",function(){t.isPaused?t._upstreamEnded=!0:t.end()})},s.prototype.pause=function(){return!!i.prototype.pause.call(this)&&(this._stream.pause(),!0)},s.prototype.resume=function(){return!!i.prototype.resume.call(this)&&(this._upstreamEnded?this.end():this._stream.resume(),!0)},t.exports=s},{"../stream/GenericWorker":28,"../utils":32}],13:[function(e,t,r){"use strict";var i=e("readable-stream").Readable;function n(e,t,r){i.call(this,t),this._helper=e;var n=this;e.on("data",function(e,t){n.push(e)||n._helper.pause(),r&&r(t)}).on("error",function(e){n.emit("error",e)}).on("end",function(){n.push(null)})}e("../utils").inherits(n,i),n.prototype._read=function(){this._helper.resume()},t.exports=n},{"../utils":32,"readable-stream":16}],14:[function(e,t,r){"use strict";t.exports={isNode:"undefined"!=typeof Buffer,newBufferFrom:function(e,t){if(Buffer.from&&Buffer.from!==Uint8Array.from)return Buffer.from(e,t);if("number"==typeof e)throw new Error('The "data" argument must not be a number');return new Buffer(e,t)},allocBuffer:function(e){if(Buffer.alloc)return Buffer.alloc(e);var t=new Buffer(e);return t.fill(0),t},isBuffer:function(e){return Buffer.isBuffer(e)},isStream:function(e){return e&&"function"==typeof e.on&&"function"==typeof e.pause&&"function"==typeof e.resume}}},{}],15:[function(e,t,r){"use strict";function s(e,t,r){var n,i=u.getTypeOf(t),s=u.extend(r||{},f);s.date=s.date||new Date,null!==s.compression&&(s.compression=s.compression.toUpperCase()),"string"==typeof s.unixPermissions&&(s.unixPermissions=parseInt(s.unixPermissions,8)),s.unixPermissions&&16384&s.unixPermissions&&(s.dir=!0),s.dosPermissions&&16&s.dosPermissions&&(s.dir=!0),s.dir&&(e=g(e)),s.createFolders&&(n=_(e))&&b.call(this,n,!0);var a="string"===i&&!1===s.binary&&!1===s.base64;r&&void 0!==r.binary||(s.binary=!a),(t instanceof c&&0===t.uncompressedSize||s.dir||!t||0===t.length)&&(s.base64=!1,s.binary=!0,t="",s.compression="STORE",i="string");var o=null;o=t instanceof c||t instanceof l?t:p.isNode&&p.isStream(t)?new m(e,t):u.prepareContent(e,t,s.binary,s.optimizedBinaryString,s.base64);var h=new d(e,o,s);this.files[e]=h}var i=e("./utf8"),u=e("./utils"),l=e("./stream/GenericWorker"),a=e("./stream/StreamHelper"),f=e("./defaults"),c=e("./compressedObject"),d=e("./zipObject"),o=e("./generate"),p=e("./nodejsUtils"),m=e("./nodejs/NodejsStreamInputAdapter"),_=function(e){"/"===e.slice(-1)&&(e=e.substring(0,e.length-1));var t=e.lastIndexOf("/");return 0<t?e.substring(0,t):""},g=function(e){return"/"!==e.slice(-1)&&(e+="/"),e},b=function(e,t){return t=void 0!==t?t:f.createFolders,e=g(e),this.files[e]||s.call(this,e,null,{dir:!0,createFolders:t}),this.files[e]};function h(e){return"[object RegExp]"===Object.prototype.toString.call(e)}var n={load:function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},forEach:function(e){var t,r,n;for(t in this.files)n=this.files[t],(r=t.slice(this.root.length,t.length))&&t.slice(0,this.root.length)===this.root&&e(r,n)},filter:function(r){var n=[];return this.forEach(function(e,t){r(e,t)&&n.push(t)}),n},file:function(e,t,r){if(1!==arguments.length)return e=this.root+e,s.call(this,e,t,r),this;if(h(e)){var n=e;return this.filter(function(e,t){return!t.dir&&n.test(e)})}var i=this.files[this.root+e];return i&&!i.dir?i:null},folder:function(r){if(!r)return this;if(h(r))return this.filter(function(e,t){return t.dir&&r.test(e)});var e=this.root+r,t=b.call(this,e),n=this.clone();return n.root=t.name,n},remove:function(r){r=this.root+r;var e=this.files[r];if(e||("/"!==r.slice(-1)&&(r+="/"),e=this.files[r]),e&&!e.dir)delete this.files[r];else for(var t=this.filter(function(e,t){return t.name.slice(0,r.length)===r}),n=0;n<t.length;n++)delete this.files[t[n].name];return this},generate:function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},generateInternalStream:function(e){var t,r={};try{if((r=u.extend(e||{},{streamFiles:!1,compression:"STORE",compressionOptions:null,type:"",platform:"DOS",comment:null,mimeType:"application/zip",encodeFileName:i.utf8encode})).type=r.type.toLowerCase(),r.compression=r.compression.toUpperCase(),"binarystring"===r.type&&(r.type="string"),!r.type)throw new Error("No output type specified.");u.checkSupport(r.type),"darwin"!==r.platform&&"freebsd"!==r.platform&&"linux"!==r.platform&&"sunos"!==r.platform||(r.platform="UNIX"),"win32"===r.platform&&(r.platform="DOS");var n=r.comment||this.comment||"";t=o.generateWorker(this,r,n)}catch(e){(t=new l("error")).error(e)}return new a(t,r.type||"string",r.mimeType)},generateAsync:function(e,t){return this.generateInternalStream(e).accumulate(t)},generateNodeStream:function(e,t){return(e=e||{}).type||(e.type="nodebuffer"),this.generateInternalStream(e).toNodejsStream(t)}};t.exports=n},{"./compressedObject":2,"./defaults":5,"./generate":9,"./nodejs/NodejsStreamInputAdapter":12,"./nodejsUtils":14,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31,"./utils":32,"./zipObject":35}],16:[function(e,t,r){"use strict";t.exports=e("stream")},{stream:void 0}],17:[function(e,t,r){"use strict";var n=e("./DataReader");function i(e){n.call(this,e);for(var t=0;t<this.data.length;t++)e[t]=255&e[t]}e("../utils").inherits(i,n),i.prototype.byteAt=function(e){return this.data[this.zero+e]},i.prototype.lastIndexOfSignature=function(e){for(var t=e.charCodeAt(0),r=e.charCodeAt(1),n=e.charCodeAt(2),i=e.charCodeAt(3),s=this.length-4;0<=s;--s)if(this.data[s]===t&&this.data[s+1]===r&&this.data[s+2]===n&&this.data[s+3]===i)return s-this.zero;return-1},i.prototype.readAndCheckSignature=function(e){var t=e.charCodeAt(0),r=e.charCodeAt(1),n=e.charCodeAt(2),i=e.charCodeAt(3),s=this.readData(4);return t===s[0]&&r===s[1]&&n===s[2]&&i===s[3]},i.prototype.readData=function(e){if(this.checkOffset(e),0===e)return[];var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./DataReader":18}],18:[function(e,t,r){"use strict";var n=e("../utils");function i(e){this.data=e,this.length=e.length,this.index=0,this.zero=0}i.prototype={checkOffset:function(e){this.checkIndex(this.index+e)},checkIndex:function(e){if(this.length<this.zero+e||e<0)throw new Error("End of data reached (data length = "+this.length+", asked index = "+e+"). Corrupted zip ?")},setIndex:function(e){this.checkIndex(e),this.index=e},skip:function(e){this.setIndex(this.index+e)},byteAt:function(){},readInt:function(e){var t,r=0;for(this.checkOffset(e),t=this.index+e-1;t>=this.index;t--)r=(r<<8)+this.byteAt(t);return this.index+=e,r},readString:function(e){return n.transformTo("string",this.readData(e))},readData:function(){},lastIndexOfSignature:function(){},readAndCheckSignature:function(){},readDate:function(){var e=this.readInt(4);return new Date(Date.UTC(1980+(e>>25&127),(e>>21&15)-1,e>>16&31,e>>11&31,e>>5&63,(31&e)<<1))}},t.exports=i},{"../utils":32}],19:[function(e,t,r){"use strict";var n=e("./Uint8ArrayReader");function i(e){n.call(this,e)}e("../utils").inherits(i,n),i.prototype.readData=function(e){this.checkOffset(e);var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./Uint8ArrayReader":21}],20:[function(e,t,r){"use strict";var n=e("./DataReader");function i(e){n.call(this,e)}e("../utils").inherits(i,n),i.prototype.byteAt=function(e){return this.data.charCodeAt(this.zero+e)},i.prototype.lastIndexOfSignature=function(e){return this.data.lastIndexOf(e)-this.zero},i.prototype.readAndCheckSignature=function(e){return e===this.readData(4)},i.prototype.readData=function(e){this.checkOffset(e);var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./DataReader":18}],21:[function(e,t,r){"use strict";var n=e("./ArrayReader");function i(e){n.call(this,e)}e("../utils").inherits(i,n),i.prototype.readData=function(e){if(this.checkOffset(e),0===e)return new Uint8Array(0);var t=this.data.subarray(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./ArrayReader":17}],22:[function(e,t,r){"use strict";var n=e("../utils"),i=e("../support"),s=e("./ArrayReader"),a=e("./StringReader"),o=e("./NodeBufferReader"),h=e("./Uint8ArrayReader");t.exports=function(e){var t=n.getTypeOf(e);return n.checkSupport(t),"string"!==t||i.uint8array?"nodebuffer"===t?new o(e):i.uint8array?new h(n.transformTo("uint8array",e)):new s(n.transformTo("array",e)):new a(e)}},{"../support":30,"../utils":32,"./ArrayReader":17,"./NodeBufferReader":19,"./StringReader":20,"./Uint8ArrayReader":21}],23:[function(e,t,r){"use strict";r.LOCAL_FILE_HEADER="PK",r.CENTRAL_FILE_HEADER="PK",r.CENTRAL_DIRECTORY_END="PK",r.ZIP64_CENTRAL_DIRECTORY_LOCATOR="PK",r.ZIP64_CENTRAL_DIRECTORY_END="PK",r.DATA_DESCRIPTOR="PK\b"},{}],24:[function(e,t,r){"use strict";var n=e("./GenericWorker"),i=e("../utils");function s(e){n.call(this,"ConvertWorker to "+e),this.destType=e}i.inherits(s,n),s.prototype.processChunk=function(e){this.push({data:i.transformTo(this.destType,e.data),meta:e.meta})},t.exports=s},{"../utils":32,"./GenericWorker":28}],25:[function(e,t,r){"use strict";var n=e("./GenericWorker"),i=e("../crc32");function s(){n.call(this,"Crc32Probe"),this.withStreamInfo("crc32",0)}e("../utils").inherits(s,n),s.prototype.processChunk=function(e){this.streamInfo.crc32=i(e.data,this.streamInfo.crc32||0),this.push(e)},t.exports=s},{"../crc32":4,"../utils":32,"./GenericWorker":28}],26:[function(e,t,r){"use strict";var n=e("../utils"),i=e("./GenericWorker");function s(e){i.call(this,"DataLengthProbe for "+e),this.propName=e,this.withStreamInfo(e,0)}n.inherits(s,i),s.prototype.processChunk=function(e){if(e){var t=this.streamInfo[this.propName]||0;this.streamInfo[this.propName]=t+e.data.length}i.prototype.processChunk.call(this,e)},t.exports=s},{"../utils":32,"./GenericWorker":28}],27:[function(e,t,r){"use strict";var n=e("../utils"),i=e("./GenericWorker");function s(e){i.call(this,"DataWorker");var t=this;this.dataIsReady=!1,this.index=0,this.max=0,this.data=null,this.type="",this._tickScheduled=!1,e.then(function(e){t.dataIsReady=!0,t.data=e,t.max=e&&e.length||0,t.type=n.getTypeOf(e),t.isPaused||t._tickAndRepeat()},function(e){t.error(e)})}n.inherits(s,i),s.prototype.cleanUp=function(){i.prototype.cleanUp.call(this),this.data=null},s.prototype.resume=function(){return!!i.prototype.resume.call(this)&&(!this._tickScheduled&&this.dataIsReady&&(this._tickScheduled=!0,n.delay(this._tickAndRepeat,[],this)),!0)},s.prototype._tickAndRepeat=function(){this._tickScheduled=!1,this.isPaused||this.isFinished||(this._tick(),this.isFinished||(n.delay(this._tickAndRepeat,[],this),this._tickScheduled=!0))},s.prototype._tick=function(){if(this.isPaused||this.isFinished)return!1;var e=null,t=Math.min(this.max,this.index+16384);if(this.index>=this.max)return this.end();switch(this.type){case"string":e=this.data.substring(this.index,t);break;case"uint8array":e=this.data.subarray(this.index,t);break;case"array":case"nodebuffer":e=this.data.slice(this.index,t)}return this.index=t,this.push({data:e,meta:{percent:this.max?this.index/this.max*100:0}})},t.exports=s},{"../utils":32,"./GenericWorker":28}],28:[function(e,t,r){"use strict";function n(e){this.name=e||"default",this.streamInfo={},this.generatedError=null,this.extraStreamInfo={},this.isPaused=!0,this.isFinished=!1,this.isLocked=!1,this._listeners={data:[],end:[],error:[]},this.previous=null}n.prototype={push:function(e){this.emit("data",e)},end:function(){if(this.isFinished)return!1;this.flush();try{this.emit("end"),this.cleanUp(),this.isFinished=!0}catch(e){this.emit("error",e)}return!0},error:function(e){return!this.isFinished&&(this.isPaused?this.generatedError=e:(this.isFinished=!0,this.emit("error",e),this.previous&&this.previous.error(e),this.cleanUp()),!0)},on:function(e,t){return this._listeners[e].push(t),this},cleanUp:function(){this.streamInfo=this.generatedError=this.extraStreamInfo=null,this._listeners=[]},emit:function(e,t){if(this._listeners[e])for(var r=0;r<this._listeners[e].length;r++)this._listeners[e][r].call(this,t)},pipe:function(e){return e.registerPrevious(this)},registerPrevious:function(e){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.streamInfo=e.streamInfo,this.mergeStreamInfo(),this.previous=e;var t=this;return e.on("data",function(e){t.processChunk(e)}),e.on("end",function(){t.end()}),e.on("error",function(e){t.error(e)}),this},pause:function(){return!this.isPaused&&!this.isFinished&&(this.isPaused=!0,this.previous&&this.previous.pause(),!0)},resume:function(){if(!this.isPaused||this.isFinished)return!1;var e=this.isPaused=!1;return this.generatedError&&(this.error(this.generatedError),e=!0),this.previous&&this.previous.resume(),!e},flush:function(){},processChunk:function(e){this.push(e)},withStreamInfo:function(e,t){return this.extraStreamInfo[e]=t,this.mergeStreamInfo(),this},mergeStreamInfo:function(){for(var e in this.extraStreamInfo)Object.prototype.hasOwnProperty.call(this.extraStreamInfo,e)&&(this.streamInfo[e]=this.extraStreamInfo[e])},lock:function(){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.isLocked=!0,this.previous&&this.previous.lock()},toString:function(){var e="Worker "+this.name;return this.previous?this.previous+" -> "+e:e}},t.exports=n},{}],29:[function(e,t,r){"use strict";var h=e("../utils"),i=e("./ConvertWorker"),s=e("./GenericWorker"),u=e("../base64"),n=e("../support"),a=e("../external"),o=null;if(n.nodestream)try{o=e("../nodejs/NodejsStreamOutputAdapter")}catch(e){}function l(e,o){return new a.Promise(function(t,r){var n=[],i=e._internalType,s=e._outputType,a=e._mimeType;e.on("data",function(e,t){n.push(e),o&&o(t)}).on("error",function(e){n=[],r(e)}).on("end",function(){try{var e=function(e,t,r){switch(e){case"blob":return h.newBlob(h.transformTo("arraybuffer",t),r);case"base64":return u.encode(t);default:return h.transformTo(e,t)}}(s,function(e,t){var r,n=0,i=null,s=0;for(r=0;r<t.length;r++)s+=t[r].length;switch(e){case"string":return t.join("");case"array":return Array.prototype.concat.apply([],t);case"uint8array":for(i=new Uint8Array(s),r=0;r<t.length;r++)i.set(t[r],n),n+=t[r].length;return i;case"nodebuffer":return Buffer.concat(t);default:throw new Error("concat : unsupported type '"+e+"'")}}(i,n),a);t(e)}catch(e){r(e)}n=[]}).resume()})}function f(e,t,r){var n=t;switch(t){case"blob":case"arraybuffer":n="uint8array";break;case"base64":n="string"}try{this._internalType=n,this._outputType=t,this._mimeType=r,h.checkSupport(n),this._worker=e.pipe(new i(n)),e.lock()}catch(e){this._worker=new s("error"),this._worker.error(e)}}f.prototype={accumulate:function(e){return l(this,e)},on:function(e,t){var r=this;return"data"===e?this._worker.on(e,function(e){t.call(r,e.data,e.meta)}):this._worker.on(e,function(){h.delay(t,arguments,r)}),this},resume:function(){return h.delay(this._worker.resume,[],this._worker),this},pause:function(){return this._worker.pause(),this},toNodejsStream:function(e){if(h.checkSupport("nodestream"),"nodebuffer"!==this._outputType)throw new Error(this._outputType+" is not supported by this method");return new o(this,{objectMode:"nodebuffer"!==this._outputType},e)}},t.exports=f},{"../base64":1,"../external":6,"../nodejs/NodejsStreamOutputAdapter":13,"../support":30,"../utils":32,"./ConvertWorker":24,"./GenericWorker":28}],30:[function(e,t,r){"use strict";if(r.base64=!0,r.array=!0,r.string=!0,r.arraybuffer="undefined"!=typeof ArrayBuffer&&"undefined"!=typeof Uint8Array,r.nodebuffer="undefined"!=typeof Buffer,r.uint8array="undefined"!=typeof Uint8Array,"undefined"==typeof ArrayBuffer)r.blob=!1;else{var n=new ArrayBuffer(0);try{r.blob=0===new Blob([n],{type:"application/zip"}).size}catch(e){try{var i=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);i.append(n),r.blob=0===i.getBlob("application/zip").size}catch(e){r.blob=!1}}}try{r.nodestream=!!e("readable-stream").Readable}catch(e){r.nodestream=!1}},{"readable-stream":16}],31:[function(e,t,s){"use strict";for(var o=e("./utils"),h=e("./support"),r=e("./nodejsUtils"),n=e("./stream/GenericWorker"),u=new Array(256),i=0;i<256;i++)u[i]=252<=i?6:248<=i?5:240<=i?4:224<=i?3:192<=i?2:1;u[254]=u[254]=1;function a(){n.call(this,"utf-8 decode"),this.leftOver=null}function l(){n.call(this,"utf-8 encode")}s.utf8encode=function(e){return h.nodebuffer?r.newBufferFrom(e,"utf-8"):function(e){var t,r,n,i,s,a=e.length,o=0;for(i=0;i<a;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),o+=r<128?1:r<2048?2:r<65536?3:4;for(t=h.uint8array?new Uint8Array(o):new Array(o),i=s=0;s<o;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),r<128?t[s++]=r:(r<2048?t[s++]=192|r>>>6:(r<65536?t[s++]=224|r>>>12:(t[s++]=240|r>>>18,t[s++]=128|r>>>12&63),t[s++]=128|r>>>6&63),t[s++]=128|63&r);return t}(e)},s.utf8decode=function(e){return h.nodebuffer?o.transformTo("nodebuffer",e).toString("utf-8"):function(e){var t,r,n,i,s=e.length,a=new Array(2*s);for(t=r=0;t<s;)if((n=e[t++])<128)a[r++]=n;else if(4<(i=u[n]))a[r++]=65533,t+=i-1;else{for(n&=2===i?31:3===i?15:7;1<i&&t<s;)n=n<<6|63&e[t++],i--;1<i?a[r++]=65533:n<65536?a[r++]=n:(n-=65536,a[r++]=55296|n>>10&1023,a[r++]=56320|1023&n)}return a.length!==r&&(a.subarray?a=a.subarray(0,r):a.length=r),o.applyFromCharCode(a)}(e=o.transformTo(h.uint8array?"uint8array":"array",e))},o.inherits(a,n),a.prototype.processChunk=function(e){var t=o.transformTo(h.uint8array?"uint8array":"array",e.data);if(this.leftOver&&this.leftOver.length){if(h.uint8array){var r=t;(t=new Uint8Array(r.length+this.leftOver.length)).set(this.leftOver,0),t.set(r,this.leftOver.length)}else t=this.leftOver.concat(t);this.leftOver=null}var n=function(e,t){var r;for((t=t||e.length)>e.length&&(t=e.length),r=t-1;0<=r&&128==(192&e[r]);)r--;return r<0?t:0===r?t:r+u[e[r]]>t?r:t}(t),i=t;n!==t.length&&(h.uint8array?(i=t.subarray(0,n),this.leftOver=t.subarray(n,t.length)):(i=t.slice(0,n),this.leftOver=t.slice(n,t.length))),this.push({data:s.utf8decode(i),meta:e.meta})},a.prototype.flush=function(){this.leftOver&&this.leftOver.length&&(this.push({data:s.utf8decode(this.leftOver),meta:{}}),this.leftOver=null)},s.Utf8DecodeWorker=a,o.inherits(l,n),l.prototype.processChunk=function(e){this.push({data:s.utf8encode(e.data),meta:e.meta})},s.Utf8EncodeWorker=l},{"./nodejsUtils":14,"./stream/GenericWorker":28,"./support":30,"./utils":32}],32:[function(e,t,a){"use strict";var o=e("./support"),h=e("./base64"),r=e("./nodejsUtils"),u=e("./external");function n(e){return e}function l(e,t){for(var r=0;r<e.length;++r)t[r]=255&e.charCodeAt(r);return t}e("setimmediate"),a.newBlob=function(t,r){a.checkSupport("blob");try{return new Blob([t],{type:r})}catch(e){try{var n=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);return n.append(t),n.getBlob(r)}catch(e){throw new Error("Bug : can't construct the Blob.")}}};var i={stringifyByChunk:function(e,t,r){var n=[],i=0,s=e.length;if(s<=r)return String.fromCharCode.apply(null,e);for(;i<s;)"array"===t||"nodebuffer"===t?n.push(String.fromCharCode.apply(null,e.slice(i,Math.min(i+r,s)))):n.push(String.fromCharCode.apply(null,e.subarray(i,Math.min(i+r,s)))),i+=r;return n.join("")},stringifyByChar:function(e){for(var t="",r=0;r<e.length;r++)t+=String.fromCharCode(e[r]);return t},applyCanBeUsed:{uint8array:function(){try{return o.uint8array&&1===String.fromCharCode.apply(null,new Uint8Array(1)).length}catch(e){return!1}}(),nodebuffer:function(){try{return o.nodebuffer&&1===String.fromCharCode.apply(null,r.allocBuffer(1)).length}catch(e){return!1}}()}};function s(e){var t=65536,r=a.getTypeOf(e),n=!0;if("uint8array"===r?n=i.applyCanBeUsed.uint8array:"nodebuffer"===r&&(n=i.applyCanBeUsed.nodebuffer),n)for(;1<t;)try{return i.stringifyByChunk(e,r,t)}catch(e){t=Math.floor(t/2)}return i.stringifyByChar(e)}function f(e,t){for(var r=0;r<e.length;r++)t[r]=e[r];return t}a.applyFromCharCode=s;var c={};c.string={string:n,array:function(e){return l(e,new Array(e.length))},arraybuffer:function(e){return c.string.uint8array(e).buffer},uint8array:function(e){return l(e,new Uint8Array(e.length))},nodebuffer:function(e){return l(e,r.allocBuffer(e.length))}},c.array={string:s,array:n,arraybuffer:function(e){return new Uint8Array(e).buffer},uint8array:function(e){return new Uint8Array(e)},nodebuffer:function(e){return r.newBufferFrom(e)}},c.arraybuffer={string:function(e){return s(new Uint8Array(e))},array:function(e){return f(new Uint8Array(e),new Array(e.byteLength))},arraybuffer:n,uint8array:function(e){return new Uint8Array(e)},nodebuffer:function(e){return r.newBufferFrom(new Uint8Array(e))}},c.uint8array={string:s,array:function(e){return f(e,new Array(e.length))},arraybuffer:function(e){return e.buffer},uint8array:n,nodebuffer:function(e){return r.newBufferFrom(e)}},c.nodebuffer={string:s,array:function(e){return f(e,new Array(e.length))},arraybuffer:function(e){return c.nodebuffer.uint8array(e).buffer},uint8array:function(e){return f(e,new Uint8Array(e.length))},nodebuffer:n},a.transformTo=function(e,t){if(t=t||"",!e)return t;a.checkSupport(e);var r=a.getTypeOf(t);return c[r][e](t)},a.resolve=function(e){for(var t=e.split("/"),r=[],n=0;n<t.length;n++){var i=t[n];"."===i||""===i&&0!==n&&n!==t.length-1||(".."===i?r.pop():r.push(i))}return r.join("/")},a.getTypeOf=function(e){return"string"==typeof e?"string":"[object Array]"===Object.prototype.toString.call(e)?"array":o.nodebuffer&&r.isBuffer(e)?"nodebuffer":o.uint8array&&e instanceof Uint8Array?"uint8array":o.arraybuffer&&e instanceof ArrayBuffer?"arraybuffer":void 0},a.checkSupport=function(e){if(!o[e.toLowerCase()])throw new Error(e+" is not supported by this platform")},a.MAX_VALUE_16BITS=65535,a.MAX_VALUE_32BITS=-1,a.pretty=function(e){var t,r,n="";for(r=0;r<(e||"").length;r++)n+="\\x"+((t=e.charCodeAt(r))<16?"0":"")+t.toString(16).toUpperCase();return n},a.delay=function(e,t,r){setImmediate(function(){e.apply(r||null,t||[])})},a.inherits=function(e,t){function r(){}r.prototype=t.prototype,e.prototype=new r},a.extend=function(){var e,t,r={};for(e=0;e<arguments.length;e++)for(t in arguments[e])Object.prototype.hasOwnProperty.call(arguments[e],t)&&void 0===r[t]&&(r[t]=arguments[e][t]);return r},a.prepareContent=function(r,e,n,i,s){return u.Promise.resolve(e).then(function(n){return o.blob&&(n instanceof Blob||-1!==["[object File]","[object Blob]"].indexOf(Object.prototype.toString.call(n)))&&"undefined"!=typeof FileReader?new u.Promise(function(t,r){var e=new FileReader;e.onload=function(e){t(e.target.result)},e.onerror=function(e){r(e.target.error)},e.readAsArrayBuffer(n)}):n}).then(function(e){var t=a.getTypeOf(e);return t?("arraybuffer"===t?e=a.transformTo("uint8array",e):"string"===t&&(s?e=h.decode(e):n&&!0!==i&&(e=function(e){return l(e,o.uint8array?new Uint8Array(e.length):new Array(e.length))}(e))),e):u.Promise.reject(new Error("Can't read the data of '"+r+"'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"))})}},{"./base64":1,"./external":6,"./nodejsUtils":14,"./support":30,setimmediate:54}],33:[function(e,t,r){"use strict";var n=e("./reader/readerFor"),i=e("./utils"),s=e("./signature"),a=e("./zipEntry"),o=e("./support");function h(e){this.files=[],this.loadOptions=e}h.prototype={checkSignature:function(e){if(!this.reader.readAndCheckSignature(e)){this.reader.index-=4;var t=this.reader.readString(4);throw new Error("Corrupted zip or bug: unexpected signature ("+i.pretty(t)+", expected "+i.pretty(e)+")")}},isSignature:function(e,t){var r=this.reader.index;this.reader.setIndex(e);var n=this.reader.readString(4)===t;return this.reader.setIndex(r),n},readBlockEndOfCentral:function(){this.diskNumber=this.reader.readInt(2),this.diskWithCentralDirStart=this.reader.readInt(2),this.centralDirRecordsOnThisDisk=this.reader.readInt(2),this.centralDirRecords=this.reader.readInt(2),this.centralDirSize=this.reader.readInt(4),this.centralDirOffset=this.reader.readInt(4),this.zipCommentLength=this.reader.readInt(2);var e=this.reader.readData(this.zipCommentLength),t=o.uint8array?"uint8array":"array",r=i.transformTo(t,e);this.zipComment=this.loadOptions.decodeFileName(r)},readBlockZip64EndOfCentral:function(){this.zip64EndOfCentralSize=this.reader.readInt(8),this.reader.skip(4),this.diskNumber=this.reader.readInt(4),this.diskWithCentralDirStart=this.reader.readInt(4),this.centralDirRecordsOnThisDisk=this.reader.readInt(8),this.centralDirRecords=this.reader.readInt(8),this.centralDirSize=this.reader.readInt(8),this.centralDirOffset=this.reader.readInt(8),this.zip64ExtensibleData={};for(var e,t,r,n=this.zip64EndOfCentralSize-44;0<n;)e=this.reader.readInt(2),t=this.reader.readInt(4),r=this.reader.readData(t),this.zip64ExtensibleData[e]={id:e,length:t,value:r}},readBlockZip64EndOfCentralLocator:function(){if(this.diskWithZip64CentralDirStart=this.reader.readInt(4),this.relativeOffsetEndOfZip64CentralDir=this.reader.readInt(8),this.disksCount=this.reader.readInt(4),1<this.disksCount)throw new Error("Multi-volumes zip are not supported")},readLocalFiles:function(){var e,t;for(e=0;e<this.files.length;e++)t=this.files[e],this.reader.setIndex(t.localHeaderOffset),this.checkSignature(s.LOCAL_FILE_HEADER),t.readLocalPart(this.reader),t.handleUTF8(),t.processAttributes()},readCentralDir:function(){var e;for(this.reader.setIndex(this.centralDirOffset);this.reader.readAndCheckSignature(s.CENTRAL_FILE_HEADER);)(e=new a({zip64:this.zip64},this.loadOptions)).readCentralPart(this.reader),this.files.push(e);if(this.centralDirRecords!==this.files.length&&0!==this.centralDirRecords&&0===this.files.length)throw new Error("Corrupted zip or bug: expected "+this.centralDirRecords+" records in central dir, got "+this.files.length)},readEndOfCentral:function(){var e=this.reader.lastIndexOfSignature(s.CENTRAL_DIRECTORY_END);if(e<0)throw!this.isSignature(0,s.LOCAL_FILE_HEADER)?new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html"):new Error("Corrupted zip: can't find end of central directory");this.reader.setIndex(e);var t=e;if(this.checkSignature(s.CENTRAL_DIRECTORY_END),this.readBlockEndOfCentral(),this.diskNumber===i.MAX_VALUE_16BITS||this.diskWithCentralDirStart===i.MAX_VALUE_16BITS||this.centralDirRecordsOnThisDisk===i.MAX_VALUE_16BITS||this.centralDirRecords===i.MAX_VALUE_16BITS||this.centralDirSize===i.MAX_VALUE_32BITS||this.centralDirOffset===i.MAX_VALUE_32BITS){if(this.zip64=!0,(e=this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR))<0)throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");if(this.reader.setIndex(e),this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR),this.readBlockZip64EndOfCentralLocator(),!this.isSignature(this.relativeOffsetEndOfZip64CentralDir,s.ZIP64_CENTRAL_DIRECTORY_END)&&(this.relativeOffsetEndOfZip64CentralDir=this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_END),this.relativeOffsetEndOfZip64CentralDir<0))throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir),this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_END),this.readBlockZip64EndOfCentral()}var r=this.centralDirOffset+this.centralDirSize;this.zip64&&(r+=20,r+=12+this.zip64EndOfCentralSize);var n=t-r;if(0<n)this.isSignature(t,s.CENTRAL_FILE_HEADER)||(this.reader.zero=n);else if(n<0)throw new Error("Corrupted zip: missing "+Math.abs(n)+" bytes.")},prepareReader:function(e){this.reader=n(e)},load:function(e){this.prepareReader(e),this.readEndOfCentral(),this.readCentralDir(),this.readLocalFiles()}},t.exports=h},{"./reader/readerFor":22,"./signature":23,"./support":30,"./utils":32,"./zipEntry":34}],34:[function(e,t,r){"use strict";var n=e("./reader/readerFor"),s=e("./utils"),i=e("./compressedObject"),a=e("./crc32"),o=e("./utf8"),h=e("./compressions"),u=e("./support");function l(e,t){this.options=e,this.loadOptions=t}l.prototype={isEncrypted:function(){return 1==(1&this.bitFlag)},useUTF8:function(){return 2048==(2048&this.bitFlag)},readLocalPart:function(e){var t,r;if(e.skip(22),this.fileNameLength=e.readInt(2),r=e.readInt(2),this.fileName=e.readData(this.fileNameLength),e.skip(r),-1===this.compressedSize||-1===this.uncompressedSize)throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");if(null===(t=function(e){for(var t in h)if(Object.prototype.hasOwnProperty.call(h,t)&&h[t].magic===e)return h[t];return null}(this.compressionMethod)))throw new Error("Corrupted zip : compression "+s.pretty(this.compressionMethod)+" unknown (inner file : "+s.transformTo("string",this.fileName)+")");this.decompressed=new i(this.compressedSize,this.uncompressedSize,this.crc32,t,e.readData(this.compressedSize))},readCentralPart:function(e){this.versionMadeBy=e.readInt(2),e.skip(2),this.bitFlag=e.readInt(2),this.compressionMethod=e.readString(2),this.date=e.readDate(),this.crc32=e.readInt(4),this.compressedSize=e.readInt(4),this.uncompressedSize=e.readInt(4);var t=e.readInt(2);if(this.extraFieldsLength=e.readInt(2),this.fileCommentLength=e.readInt(2),this.diskNumberStart=e.readInt(2),this.internalFileAttributes=e.readInt(2),this.externalFileAttributes=e.readInt(4),this.localHeaderOffset=e.readInt(4),this.isEncrypted())throw new Error("Encrypted zip are not supported");e.skip(t),this.readExtraFields(e),this.parseZIP64ExtraField(e),this.fileComment=e.readData(this.fileCommentLength)},processAttributes:function(){this.unixPermissions=null,this.dosPermissions=null;var e=this.versionMadeBy>>8;this.dir=!!(16&this.externalFileAttributes),0==e&&(this.dosPermissions=63&this.externalFileAttributes),3==e&&(this.unixPermissions=this.externalFileAttributes>>16&65535),this.dir||"/"!==this.fileNameStr.slice(-1)||(this.dir=!0)},parseZIP64ExtraField:function(){if(this.extraFields[1]){var e=n(this.extraFields[1].value);this.uncompressedSize===s.MAX_VALUE_32BITS&&(this.uncompressedSize=e.readInt(8)),this.compressedSize===s.MAX_VALUE_32BITS&&(this.compressedSize=e.readInt(8)),this.localHeaderOffset===s.MAX_VALUE_32BITS&&(this.localHeaderOffset=e.readInt(8)),this.diskNumberStart===s.MAX_VALUE_32BITS&&(this.diskNumberStart=e.readInt(4))}},readExtraFields:function(e){var t,r,n,i=e.index+this.extraFieldsLength;for(this.extraFields||(this.extraFields={});e.index+4<i;)t=e.readInt(2),r=e.readInt(2),n=e.readData(r),this.extraFields[t]={id:t,length:r,value:n};e.setIndex(i)},handleUTF8:function(){var e=u.uint8array?"uint8array":"array";if(this.useUTF8())this.fileNameStr=o.utf8decode(this.fileName),this.fileCommentStr=o.utf8decode(this.fileComment);else{var t=this.findExtraFieldUnicodePath();if(null!==t)this.fileNameStr=t;else{var r=s.transformTo(e,this.fileName);this.fileNameStr=this.loadOptions.decodeFileName(r)}var n=this.findExtraFieldUnicodeComment();if(null!==n)this.fileCommentStr=n;else{var i=s.transformTo(e,this.fileComment);this.fileCommentStr=this.loadOptions.decodeFileName(i)}}},findExtraFieldUnicodePath:function(){var e=this.extraFields[28789];if(e){var t=n(e.value);return 1!==t.readInt(1)?null:a(this.fileName)!==t.readInt(4)?null:o.utf8decode(t.readData(e.length-5))}return null},findExtraFieldUnicodeComment:function(){var e=this.extraFields[25461];if(e){var t=n(e.value);return 1!==t.readInt(1)?null:a(this.fileComment)!==t.readInt(4)?null:o.utf8decode(t.readData(e.length-5))}return null}},t.exports=l},{"./compressedObject":2,"./compressions":3,"./crc32":4,"./reader/readerFor":22,"./support":30,"./utf8":31,"./utils":32}],35:[function(e,t,r){"use strict";function n(e,t,r){this.name=e,this.dir=r.dir,this.date=r.date,this.comment=r.comment,this.unixPermissions=r.unixPermissions,this.dosPermissions=r.dosPermissions,this._data=t,this._dataBinary=r.binary,this.options={compression:r.compression,compressionOptions:r.compressionOptions}}var s=e("./stream/StreamHelper"),i=e("./stream/DataWorker"),a=e("./utf8"),o=e("./compressedObject"),h=e("./stream/GenericWorker");n.prototype={internalStream:function(e){var t=null,r="string";try{if(!e)throw new Error("No output type specified.");var n="string"===(r=e.toLowerCase())||"text"===r;"binarystring"!==r&&"text"!==r||(r="string"),t=this._decompressWorker();var i=!this._dataBinary;i&&!n&&(t=t.pipe(new a.Utf8EncodeWorker)),!i&&n&&(t=t.pipe(new a.Utf8DecodeWorker))}catch(e){(t=new h("error")).error(e)}return new s(t,r,"")},async:function(e,t){return this.internalStream(e).accumulate(t)},nodeStream:function(e,t){return this.internalStream(e||"nodebuffer").toNodejsStream(t)},_compressWorker:function(e,t){if(this._data instanceof o&&this._data.compression.magic===e.magic)return this._data.getCompressedWorker();var r=this._decompressWorker();return this._dataBinary||(r=r.pipe(new a.Utf8EncodeWorker)),o.createWorkerFrom(r,e,t)},_decompressWorker:function(){return this._data instanceof o?this._data.getContentWorker():this._data instanceof h?this._data:new i(this._data)}};for(var u=["asText","asBinary","asNodeBuffer","asUint8Array","asArrayBuffer"],l=function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},f=0;f<u.length;f++)n.prototype[u[f]]=l;t.exports=n},{"./compressedObject":2,"./stream/DataWorker":27,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31}],36:[function(e,l,t){(function(t){"use strict";var r,n,e=t.MutationObserver||t.WebKitMutationObserver;if(e){var i=0,s=new e(u),a=t.document.createTextNode("");s.observe(a,{characterData:!0}),r=function(){a.data=i=++i%2}}else if(t.setImmediate||void 0===t.MessageChannel)r="document"in t&&"onreadystatechange"in t.document.createElement("script")?function(){var e=t.document.createElement("script");e.onreadystatechange=function(){u(),e.onreadystatechange=null,e.parentNode.removeChild(e),e=null},t.document.documentElement.appendChild(e)}:function(){setTimeout(u,0)};else{var o=new t.MessageChannel;o.port1.onmessage=u,r=function(){o.port2.postMessage(0)}}var h=[];function u(){var e,t;n=!0;for(var r=h.length;r;){for(t=h,h=[],e=-1;++e<r;)t[e]();r=h.length}n=!1}l.exports=function(e){1!==h.push(e)||n||r()}}).call(this,"undefined"!=typeof __webpack_require__.g?__webpack_require__.g:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],37:[function(e,t,r){"use strict";var i=e("immediate");function u(){}var l={},s=["REJECTED"],a=["FULFILLED"],n=["PENDING"];function o(e){if("function"!=typeof e)throw new TypeError("resolver must be a function");this.state=n,this.queue=[],this.outcome=void 0,e!==u&&d(this,e)}function h(e,t,r){this.promise=e,"function"==typeof t&&(this.onFulfilled=t,this.callFulfilled=this.otherCallFulfilled),"function"==typeof r&&(this.onRejected=r,this.callRejected=this.otherCallRejected)}function f(t,r,n){i(function(){var e;try{e=r(n)}catch(e){return l.reject(t,e)}e===t?l.reject(t,new TypeError("Cannot resolve promise with itself")):l.resolve(t,e)})}function c(e){var t=e&&e.then;if(e&&("object"==typeof e||"function"==typeof e)&&"function"==typeof t)return function(){t.apply(e,arguments)}}function d(t,e){var r=!1;function n(e){r||(r=!0,l.reject(t,e))}function i(e){r||(r=!0,l.resolve(t,e))}var s=p(function(){e(i,n)});"error"===s.status&&n(s.value)}function p(e,t){var r={};try{r.value=e(t),r.status="success"}catch(e){r.status="error",r.value=e}return r}(t.exports=o).prototype.finally=function(t){if("function"!=typeof t)return this;var r=this.constructor;return this.then(function(e){return r.resolve(t()).then(function(){return e})},function(e){return r.resolve(t()).then(function(){throw e})})},o.prototype.catch=function(e){return this.then(null,e)},o.prototype.then=function(e,t){if("function"!=typeof e&&this.state===a||"function"!=typeof t&&this.state===s)return this;var r=new this.constructor(u);this.state!==n?f(r,this.state===a?e:t,this.outcome):this.queue.push(new h(r,e,t));return r},h.prototype.callFulfilled=function(e){l.resolve(this.promise,e)},h.prototype.otherCallFulfilled=function(e){f(this.promise,this.onFulfilled,e)},h.prototype.callRejected=function(e){l.reject(this.promise,e)},h.prototype.otherCallRejected=function(e){f(this.promise,this.onRejected,e)},l.resolve=function(e,t){var r=p(c,t);if("error"===r.status)return l.reject(e,r.value);var n=r.value;if(n)d(e,n);else{e.state=a,e.outcome=t;for(var i=-1,s=e.queue.length;++i<s;)e.queue[i].callFulfilled(t)}return e},l.reject=function(e,t){e.state=s,e.outcome=t;for(var r=-1,n=e.queue.length;++r<n;)e.queue[r].callRejected(t);return e},o.resolve=function(e){if(e instanceof this)return e;return l.resolve(new this(u),e)},o.reject=function(e){var t=new this(u);return l.reject(t,e)},o.all=function(e){var r=this;if("[object Array]"!==Object.prototype.toString.call(e))return this.reject(new TypeError("must be an array"));var n=e.length,i=!1;if(!n)return this.resolve([]);var s=new Array(n),a=0,t=-1,o=new this(u);for(;++t<n;)h(e[t],t);return o;function h(e,t){r.resolve(e).then(function(e){s[t]=e,++a!==n||i||(i=!0,l.resolve(o,s))},function(e){i||(i=!0,l.reject(o,e))})}},o.race=function(e){var t=this;if("[object Array]"!==Object.prototype.toString.call(e))return this.reject(new TypeError("must be an array"));var r=e.length,n=!1;if(!r)return this.resolve([]);var i=-1,s=new this(u);for(;++i<r;)a=e[i],t.resolve(a).then(function(e){n||(n=!0,l.resolve(s,e))},function(e){n||(n=!0,l.reject(s,e))});var a;return s}},{immediate:36}],38:[function(e,t,r){"use strict";var n={};(0,e("./lib/utils/common").assign)(n,e("./lib/deflate"),e("./lib/inflate"),e("./lib/zlib/constants")),t.exports=n},{"./lib/deflate":39,"./lib/inflate":40,"./lib/utils/common":41,"./lib/zlib/constants":44}],39:[function(e,t,r){"use strict";var a=e("./zlib/deflate"),o=e("./utils/common"),h=e("./utils/strings"),i=e("./zlib/messages"),s=e("./zlib/zstream"),u=Object.prototype.toString,l=0,f=-1,c=0,d=8;function p(e){if(!(this instanceof p))return new p(e);this.options=o.assign({level:f,method:d,chunkSize:16384,windowBits:15,memLevel:8,strategy:c,to:""},e||{});var t=this.options;t.raw&&0<t.windowBits?t.windowBits=-t.windowBits:t.gzip&&0<t.windowBits&&t.windowBits<16&&(t.windowBits+=16),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new s,this.strm.avail_out=0;var r=a.deflateInit2(this.strm,t.level,t.method,t.windowBits,t.memLevel,t.strategy);if(r!==l)throw new Error(i[r]);if(t.header&&a.deflateSetHeader(this.strm,t.header),t.dictionary){var n;if(n="string"==typeof t.dictionary?h.string2buf(t.dictionary):"[object ArrayBuffer]"===u.call(t.dictionary)?new Uint8Array(t.dictionary):t.dictionary,(r=a.deflateSetDictionary(this.strm,n))!==l)throw new Error(i[r]);this._dict_set=!0}}function n(e,t){var r=new p(t);if(r.push(e,!0),r.err)throw r.msg||i[r.err];return r.result}p.prototype.push=function(e,t){var r,n,i=this.strm,s=this.options.chunkSize;if(this.ended)return!1;n=t===~~t?t:!0===t?4:0,"string"==typeof e?i.input=h.string2buf(e):"[object ArrayBuffer]"===u.call(e)?i.input=new Uint8Array(e):i.input=e,i.next_in=0,i.avail_in=i.input.length;do{if(0===i.avail_out&&(i.output=new o.Buf8(s),i.next_out=0,i.avail_out=s),1!==(r=a.deflate(i,n))&&r!==l)return this.onEnd(r),!(this.ended=!0);0!==i.avail_out&&(0!==i.avail_in||4!==n&&2!==n)||("string"===this.options.to?this.onData(h.buf2binstring(o.shrinkBuf(i.output,i.next_out))):this.onData(o.shrinkBuf(i.output,i.next_out)))}while((0<i.avail_in||0===i.avail_out)&&1!==r);return 4===n?(r=a.deflateEnd(this.strm),this.onEnd(r),this.ended=!0,r===l):2!==n||(this.onEnd(l),!(i.avail_out=0))},p.prototype.onData=function(e){this.chunks.push(e)},p.prototype.onEnd=function(e){e===l&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=o.flattenChunks(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg},r.Deflate=p,r.deflate=n,r.deflateRaw=function(e,t){return(t=t||{}).raw=!0,n(e,t)},r.gzip=function(e,t){return(t=t||{}).gzip=!0,n(e,t)}},{"./utils/common":41,"./utils/strings":42,"./zlib/deflate":46,"./zlib/messages":51,"./zlib/zstream":53}],40:[function(e,t,r){"use strict";var c=e("./zlib/inflate"),d=e("./utils/common"),p=e("./utils/strings"),m=e("./zlib/constants"),n=e("./zlib/messages"),i=e("./zlib/zstream"),s=e("./zlib/gzheader"),_=Object.prototype.toString;function a(e){if(!(this instanceof a))return new a(e);this.options=d.assign({chunkSize:16384,windowBits:0,to:""},e||{});var t=this.options;t.raw&&0<=t.windowBits&&t.windowBits<16&&(t.windowBits=-t.windowBits,0===t.windowBits&&(t.windowBits=-15)),!(0<=t.windowBits&&t.windowBits<16)||e&&e.windowBits||(t.windowBits+=32),15<t.windowBits&&t.windowBits<48&&0==(15&t.windowBits)&&(t.windowBits|=15),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new i,this.strm.avail_out=0;var r=c.inflateInit2(this.strm,t.windowBits);if(r!==m.Z_OK)throw new Error(n[r]);this.header=new s,c.inflateGetHeader(this.strm,this.header)}function o(e,t){var r=new a(t);if(r.push(e,!0),r.err)throw r.msg||n[r.err];return r.result}a.prototype.push=function(e,t){var r,n,i,s,a,o,h=this.strm,u=this.options.chunkSize,l=this.options.dictionary,f=!1;if(this.ended)return!1;n=t===~~t?t:!0===t?m.Z_FINISH:m.Z_NO_FLUSH,"string"==typeof e?h.input=p.binstring2buf(e):"[object ArrayBuffer]"===_.call(e)?h.input=new Uint8Array(e):h.input=e,h.next_in=0,h.avail_in=h.input.length;do{if(0===h.avail_out&&(h.output=new d.Buf8(u),h.next_out=0,h.avail_out=u),(r=c.inflate(h,m.Z_NO_FLUSH))===m.Z_NEED_DICT&&l&&(o="string"==typeof l?p.string2buf(l):"[object ArrayBuffer]"===_.call(l)?new Uint8Array(l):l,r=c.inflateSetDictionary(this.strm,o)),r===m.Z_BUF_ERROR&&!0===f&&(r=m.Z_OK,f=!1),r!==m.Z_STREAM_END&&r!==m.Z_OK)return this.onEnd(r),!(this.ended=!0);h.next_out&&(0!==h.avail_out&&r!==m.Z_STREAM_END&&(0!==h.avail_in||n!==m.Z_FINISH&&n!==m.Z_SYNC_FLUSH)||("string"===this.options.to?(i=p.utf8border(h.output,h.next_out),s=h.next_out-i,a=p.buf2string(h.output,i),h.next_out=s,h.avail_out=u-s,s&&d.arraySet(h.output,h.output,i,s,0),this.onData(a)):this.onData(d.shrinkBuf(h.output,h.next_out)))),0===h.avail_in&&0===h.avail_out&&(f=!0)}while((0<h.avail_in||0===h.avail_out)&&r!==m.Z_STREAM_END);return r===m.Z_STREAM_END&&(n=m.Z_FINISH),n===m.Z_FINISH?(r=c.inflateEnd(this.strm),this.onEnd(r),this.ended=!0,r===m.Z_OK):n!==m.Z_SYNC_FLUSH||(this.onEnd(m.Z_OK),!(h.avail_out=0))},a.prototype.onData=function(e){this.chunks.push(e)},a.prototype.onEnd=function(e){e===m.Z_OK&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=d.flattenChunks(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg},r.Inflate=a,r.inflate=o,r.inflateRaw=function(e,t){return(t=t||{}).raw=!0,o(e,t)},r.ungzip=o},{"./utils/common":41,"./utils/strings":42,"./zlib/constants":44,"./zlib/gzheader":47,"./zlib/inflate":49,"./zlib/messages":51,"./zlib/zstream":53}],41:[function(e,t,r){"use strict";var n="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Int32Array;r.assign=function(e){for(var t=Array.prototype.slice.call(arguments,1);t.length;){var r=t.shift();if(r){if("object"!=typeof r)throw new TypeError(r+"must be non-object");for(var n in r)r.hasOwnProperty(n)&&(e[n]=r[n])}}return e},r.shrinkBuf=function(e,t){return e.length===t?e:e.subarray?e.subarray(0,t):(e.length=t,e)};var i={arraySet:function(e,t,r,n,i){if(t.subarray&&e.subarray)e.set(t.subarray(r,r+n),i);else for(var s=0;s<n;s++)e[i+s]=t[r+s]},flattenChunks:function(e){var t,r,n,i,s,a;for(t=n=0,r=e.length;t<r;t++)n+=e[t].length;for(a=new Uint8Array(n),t=i=0,r=e.length;t<r;t++)s=e[t],a.set(s,i),i+=s.length;return a}},s={arraySet:function(e,t,r,n,i){for(var s=0;s<n;s++)e[i+s]=t[r+s]},flattenChunks:function(e){return[].concat.apply([],e)}};r.setTyped=function(e){e?(r.Buf8=Uint8Array,r.Buf16=Uint16Array,r.Buf32=Int32Array,r.assign(r,i)):(r.Buf8=Array,r.Buf16=Array,r.Buf32=Array,r.assign(r,s))},r.setTyped(n)},{}],42:[function(e,t,r){"use strict";var h=e("./common"),i=!0,s=!0;try{String.fromCharCode.apply(null,[0])}catch(e){i=!1}try{String.fromCharCode.apply(null,new Uint8Array(1))}catch(e){s=!1}for(var u=new h.Buf8(256),n=0;n<256;n++)u[n]=252<=n?6:248<=n?5:240<=n?4:224<=n?3:192<=n?2:1;function l(e,t){if(t<65537&&(e.subarray&&s||!e.subarray&&i))return String.fromCharCode.apply(null,h.shrinkBuf(e,t));for(var r="",n=0;n<t;n++)r+=String.fromCharCode(e[n]);return r}u[254]=u[254]=1,r.string2buf=function(e){var t,r,n,i,s,a=e.length,o=0;for(i=0;i<a;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),o+=r<128?1:r<2048?2:r<65536?3:4;for(t=new h.Buf8(o),i=s=0;s<o;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),r<128?t[s++]=r:(r<2048?t[s++]=192|r>>>6:(r<65536?t[s++]=224|r>>>12:(t[s++]=240|r>>>18,t[s++]=128|r>>>12&63),t[s++]=128|r>>>6&63),t[s++]=128|63&r);return t},r.buf2binstring=function(e){return l(e,e.length)},r.binstring2buf=function(e){for(var t=new h.Buf8(e.length),r=0,n=t.length;r<n;r++)t[r]=e.charCodeAt(r);return t},r.buf2string=function(e,t){var r,n,i,s,a=t||e.length,o=new Array(2*a);for(r=n=0;r<a;)if((i=e[r++])<128)o[n++]=i;else if(4<(s=u[i]))o[n++]=65533,r+=s-1;else{for(i&=2===s?31:3===s?15:7;1<s&&r<a;)i=i<<6|63&e[r++],s--;1<s?o[n++]=65533:i<65536?o[n++]=i:(i-=65536,o[n++]=55296|i>>10&1023,o[n++]=56320|1023&i)}return l(o,n)},r.utf8border=function(e,t){var r;for((t=t||e.length)>e.length&&(t=e.length),r=t-1;0<=r&&128==(192&e[r]);)r--;return r<0?t:0===r?t:r+u[e[r]]>t?r:t}},{"./common":41}],43:[function(e,t,r){"use strict";t.exports=function(e,t,r,n){for(var i=65535&e|0,s=e>>>16&65535|0,a=0;0!==r;){for(r-=a=2e3<r?2e3:r;s=s+(i=i+t[n++]|0)|0,--a;);i%=65521,s%=65521}return i|s<<16|0}},{}],44:[function(e,t,r){"use strict";t.exports={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8}},{}],45:[function(e,t,r){"use strict";var o=function(){for(var e,t=[],r=0;r<256;r++){e=r;for(var n=0;n<8;n++)e=1&e?3988292384^e>>>1:e>>>1;t[r]=e}return t}();t.exports=function(e,t,r,n){var i=o,s=n+r;e^=-1;for(var a=n;a<s;a++)e=e>>>8^i[255&(e^t[a])];return-1^e}},{}],46:[function(e,t,r){"use strict";var h,c=e("../utils/common"),u=e("./trees"),d=e("./adler32"),p=e("./crc32"),n=e("./messages"),l=0,f=4,m=0,_=-2,g=-1,b=4,i=2,v=8,y=9,s=286,a=30,o=19,w=2*s+1,k=15,x=3,S=258,z=S+x+1,C=42,E=113,A=1,I=2,O=3,B=4;function R(e,t){return e.msg=n[t],t}function T(e){return(e<<1)-(4<e?9:0)}function D(e){for(var t=e.length;0<=--t;)e[t]=0}function F(e){var t=e.state,r=t.pending;r>e.avail_out&&(r=e.avail_out),0!==r&&(c.arraySet(e.output,t.pending_buf,t.pending_out,r,e.next_out),e.next_out+=r,t.pending_out+=r,e.total_out+=r,e.avail_out-=r,t.pending-=r,0===t.pending&&(t.pending_out=0))}function N(e,t){u._tr_flush_block(e,0<=e.block_start?e.block_start:-1,e.strstart-e.block_start,t),e.block_start=e.strstart,F(e.strm)}function U(e,t){e.pending_buf[e.pending++]=t}function P(e,t){e.pending_buf[e.pending++]=t>>>8&255,e.pending_buf[e.pending++]=255&t}function L(e,t){var r,n,i=e.max_chain_length,s=e.strstart,a=e.prev_length,o=e.nice_match,h=e.strstart>e.w_size-z?e.strstart-(e.w_size-z):0,u=e.window,l=e.w_mask,f=e.prev,c=e.strstart+S,d=u[s+a-1],p=u[s+a];e.prev_length>=e.good_match&&(i>>=2),o>e.lookahead&&(o=e.lookahead);do{if(u[(r=t)+a]===p&&u[r+a-1]===d&&u[r]===u[s]&&u[++r]===u[s+1]){s+=2,r++;do{}while(u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&s<c);if(n=S-(c-s),s=c-S,a<n){if(e.match_start=t,o<=(a=n))break;d=u[s+a-1],p=u[s+a]}}}while((t=f[t&l])>h&&0!=--i);return a<=e.lookahead?a:e.lookahead}function j(e){var t,r,n,i,s,a,o,h,u,l,f=e.w_size;do{if(i=e.window_size-e.lookahead-e.strstart,e.strstart>=f+(f-z)){for(c.arraySet(e.window,e.window,f,f,0),e.match_start-=f,e.strstart-=f,e.block_start-=f,t=r=e.hash_size;n=e.head[--t],e.head[t]=f<=n?n-f:0,--r;);for(t=r=f;n=e.prev[--t],e.prev[t]=f<=n?n-f:0,--r;);i+=f}if(0===e.strm.avail_in)break;if(a=e.strm,o=e.window,h=e.strstart+e.lookahead,u=i,l=void 0,l=a.avail_in,u<l&&(l=u),r=0===l?0:(a.avail_in-=l,c.arraySet(o,a.input,a.next_in,l,h),1===a.state.wrap?a.adler=d(a.adler,o,l,h):2===a.state.wrap&&(a.adler=p(a.adler,o,l,h)),a.next_in+=l,a.total_in+=l,l),e.lookahead+=r,e.lookahead+e.insert>=x)for(s=e.strstart-e.insert,e.ins_h=e.window[s],e.ins_h=(e.ins_h<<e.hash_shift^e.window[s+1])&e.hash_mask;e.insert&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[s+x-1])&e.hash_mask,e.prev[s&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=s,s++,e.insert--,!(e.lookahead+e.insert<x)););}while(e.lookahead<z&&0!==e.strm.avail_in)}function Z(e,t){for(var r,n;;){if(e.lookahead<z){if(j(e),e.lookahead<z&&t===l)return A;if(0===e.lookahead)break}if(r=0,e.lookahead>=x&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),0!==r&&e.strstart-r<=e.w_size-z&&(e.match_length=L(e,r)),e.match_length>=x)if(n=u._tr_tally(e,e.strstart-e.match_start,e.match_length-x),e.lookahead-=e.match_length,e.match_length<=e.max_lazy_match&&e.lookahead>=x){for(e.match_length--;e.strstart++,e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart,0!=--e.match_length;);e.strstart++}else e.strstart+=e.match_length,e.match_length=0,e.ins_h=e.window[e.strstart],e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+1])&e.hash_mask;else n=u._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++;if(n&&(N(e,!1),0===e.strm.avail_out))return A}return e.insert=e.strstart<x-1?e.strstart:x-1,t===f?(N(e,!0),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,!1),0===e.strm.avail_out)?A:I}function W(e,t){for(var r,n,i;;){if(e.lookahead<z){if(j(e),e.lookahead<z&&t===l)return A;if(0===e.lookahead)break}if(r=0,e.lookahead>=x&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),e.prev_length=e.match_length,e.prev_match=e.match_start,e.match_length=x-1,0!==r&&e.prev_length<e.max_lazy_match&&e.strstart-r<=e.w_size-z&&(e.match_length=L(e,r),e.match_length<=5&&(1===e.strategy||e.match_length===x&&4096<e.strstart-e.match_start)&&(e.match_length=x-1)),e.prev_length>=x&&e.match_length<=e.prev_length){for(i=e.strstart+e.lookahead-x,n=u._tr_tally(e,e.strstart-1-e.prev_match,e.prev_length-x),e.lookahead-=e.prev_length-1,e.prev_length-=2;++e.strstart<=i&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),0!=--e.prev_length;);if(e.match_available=0,e.match_length=x-1,e.strstart++,n&&(N(e,!1),0===e.strm.avail_out))return A}else if(e.match_available){if((n=u._tr_tally(e,0,e.window[e.strstart-1]))&&N(e,!1),e.strstart++,e.lookahead--,0===e.strm.avail_out)return A}else e.match_available=1,e.strstart++,e.lookahead--}return e.match_available&&(n=u._tr_tally(e,0,e.window[e.strstart-1]),e.match_available=0),e.insert=e.strstart<x-1?e.strstart:x-1,t===f?(N(e,!0),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,!1),0===e.strm.avail_out)?A:I}function M(e,t,r,n,i){this.good_length=e,this.max_lazy=t,this.nice_length=r,this.max_chain=n,this.func=i}function H(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=v,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new c.Buf16(2*w),this.dyn_dtree=new c.Buf16(2*(2*a+1)),this.bl_tree=new c.Buf16(2*(2*o+1)),D(this.dyn_ltree),D(this.dyn_dtree),D(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new c.Buf16(k+1),this.heap=new c.Buf16(2*s+1),D(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new c.Buf16(2*s+1),D(this.depth),this.l_buf=0,this.lit_bufsize=0,this.last_lit=0,this.d_buf=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}function G(e){var t;return e&&e.state?(e.total_in=e.total_out=0,e.data_type=i,(t=e.state).pending=0,t.pending_out=0,t.wrap<0&&(t.wrap=-t.wrap),t.status=t.wrap?C:E,e.adler=2===t.wrap?0:1,t.last_flush=l,u._tr_init(t),m):R(e,_)}function K(e){var t=G(e);return t===m&&function(e){e.window_size=2*e.w_size,D(e.head),e.max_lazy_match=h[e.level].max_lazy,e.good_match=h[e.level].good_length,e.nice_match=h[e.level].nice_length,e.max_chain_length=h[e.level].max_chain,e.strstart=0,e.block_start=0,e.lookahead=0,e.insert=0,e.match_length=e.prev_length=x-1,e.match_available=0,e.ins_h=0}(e.state),t}function Y(e,t,r,n,i,s){if(!e)return _;var a=1;if(t===g&&(t=6),n<0?(a=0,n=-n):15<n&&(a=2,n-=16),i<1||y<i||r!==v||n<8||15<n||t<0||9<t||s<0||b<s)return R(e,_);8===n&&(n=9);var o=new H;return(e.state=o).strm=e,o.wrap=a,o.gzhead=null,o.w_bits=n,o.w_size=1<<o.w_bits,o.w_mask=o.w_size-1,o.hash_bits=i+7,o.hash_size=1<<o.hash_bits,o.hash_mask=o.hash_size-1,o.hash_shift=~~((o.hash_bits+x-1)/x),o.window=new c.Buf8(2*o.w_size),o.head=new c.Buf16(o.hash_size),o.prev=new c.Buf16(o.w_size),o.lit_bufsize=1<<i+6,o.pending_buf_size=4*o.lit_bufsize,o.pending_buf=new c.Buf8(o.pending_buf_size),o.d_buf=1*o.lit_bufsize,o.l_buf=3*o.lit_bufsize,o.level=t,o.strategy=s,o.method=r,K(e)}h=[new M(0,0,0,0,function(e,t){var r=65535;for(r>e.pending_buf_size-5&&(r=e.pending_buf_size-5);;){if(e.lookahead<=1){if(j(e),0===e.lookahead&&t===l)return A;if(0===e.lookahead)break}e.strstart+=e.lookahead,e.lookahead=0;var n=e.block_start+r;if((0===e.strstart||e.strstart>=n)&&(e.lookahead=e.strstart-n,e.strstart=n,N(e,!1),0===e.strm.avail_out))return A;if(e.strstart-e.block_start>=e.w_size-z&&(N(e,!1),0===e.strm.avail_out))return A}return e.insert=0,t===f?(N(e,!0),0===e.strm.avail_out?O:B):(e.strstart>e.block_start&&(N(e,!1),e.strm.avail_out),A)}),new M(4,4,8,4,Z),new M(4,5,16,8,Z),new M(4,6,32,32,Z),new M(4,4,16,16,W),new M(8,16,32,32,W),new M(8,16,128,128,W),new M(8,32,128,256,W),new M(32,128,258,1024,W),new M(32,258,258,4096,W)],r.deflateInit=function(e,t){return Y(e,t,v,15,8,0)},r.deflateInit2=Y,r.deflateReset=K,r.deflateResetKeep=G,r.deflateSetHeader=function(e,t){return e&&e.state?2!==e.state.wrap?_:(e.state.gzhead=t,m):_},r.deflate=function(e,t){var r,n,i,s;if(!e||!e.state||5<t||t<0)return e?R(e,_):_;if(n=e.state,!e.output||!e.input&&0!==e.avail_in||666===n.status&&t!==f)return R(e,0===e.avail_out?-5:_);if(n.strm=e,r=n.last_flush,n.last_flush=t,n.status===C)if(2===n.wrap)e.adler=0,U(n,31),U(n,139),U(n,8),n.gzhead?(U(n,(n.gzhead.text?1:0)+(n.gzhead.hcrc?2:0)+(n.gzhead.extra?4:0)+(n.gzhead.name?8:0)+(n.gzhead.comment?16:0)),U(n,255&n.gzhead.time),U(n,n.gzhead.time>>8&255),U(n,n.gzhead.time>>16&255),U(n,n.gzhead.time>>24&255),U(n,9===n.level?2:2<=n.strategy||n.level<2?4:0),U(n,255&n.gzhead.os),n.gzhead.extra&&n.gzhead.extra.length&&(U(n,255&n.gzhead.extra.length),U(n,n.gzhead.extra.length>>8&255)),n.gzhead.hcrc&&(e.adler=p(e.adler,n.pending_buf,n.pending,0)),n.gzindex=0,n.status=69):(U(n,0),U(n,0),U(n,0),U(n,0),U(n,0),U(n,9===n.level?2:2<=n.strategy||n.level<2?4:0),U(n,3),n.status=E);else{var a=v+(n.w_bits-8<<4)<<8;a|=(2<=n.strategy||n.level<2?0:n.level<6?1:6===n.level?2:3)<<6,0!==n.strstart&&(a|=32),a+=31-a%31,n.status=E,P(n,a),0!==n.strstart&&(P(n,e.adler>>>16),P(n,65535&e.adler)),e.adler=1}if(69===n.status)if(n.gzhead.extra){for(i=n.pending;n.gzindex<(65535&n.gzhead.extra.length)&&(n.pending!==n.pending_buf_size||(n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),F(e),i=n.pending,n.pending!==n.pending_buf_size));)U(n,255&n.gzhead.extra[n.gzindex]),n.gzindex++;n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),n.gzindex===n.gzhead.extra.length&&(n.gzindex=0,n.status=73)}else n.status=73;if(73===n.status)if(n.gzhead.name){i=n.pending;do{if(n.pending===n.pending_buf_size&&(n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),F(e),i=n.pending,n.pending===n.pending_buf_size)){s=1;break}s=n.gzindex<n.gzhead.name.length?255&n.gzhead.name.charCodeAt(n.gzindex++):0,U(n,s)}while(0!==s);n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),0===s&&(n.gzindex=0,n.status=91)}else n.status=91;if(91===n.status)if(n.gzhead.comment){i=n.pending;do{if(n.pending===n.pending_buf_size&&(n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),F(e),i=n.pending,n.pending===n.pending_buf_size)){s=1;break}s=n.gzindex<n.gzhead.comment.length?255&n.gzhead.comment.charCodeAt(n.gzindex++):0,U(n,s)}while(0!==s);n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),0===s&&(n.status=103)}else n.status=103;if(103===n.status&&(n.gzhead.hcrc?(n.pending+2>n.pending_buf_size&&F(e),n.pending+2<=n.pending_buf_size&&(U(n,255&e.adler),U(n,e.adler>>8&255),e.adler=0,n.status=E)):n.status=E),0!==n.pending){if(F(e),0===e.avail_out)return n.last_flush=-1,m}else if(0===e.avail_in&&T(t)<=T(r)&&t!==f)return R(e,-5);if(666===n.status&&0!==e.avail_in)return R(e,-5);if(0!==e.avail_in||0!==n.lookahead||t!==l&&666!==n.status){var o=2===n.strategy?function(e,t){for(var r;;){if(0===e.lookahead&&(j(e),0===e.lookahead)){if(t===l)return A;break}if(e.match_length=0,r=u._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++,r&&(N(e,!1),0===e.strm.avail_out))return A}return e.insert=0,t===f?(N(e,!0),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,!1),0===e.strm.avail_out)?A:I}(n,t):3===n.strategy?function(e,t){for(var r,n,i,s,a=e.window;;){if(e.lookahead<=S){if(j(e),e.lookahead<=S&&t===l)return A;if(0===e.lookahead)break}if(e.match_length=0,e.lookahead>=x&&0<e.strstart&&(n=a[i=e.strstart-1])===a[++i]&&n===a[++i]&&n===a[++i]){s=e.strstart+S;do{}while(n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&i<s);e.match_length=S-(s-i),e.match_length>e.lookahead&&(e.match_length=e.lookahead)}if(e.match_length>=x?(r=u._tr_tally(e,1,e.match_length-x),e.lookahead-=e.match_length,e.strstart+=e.match_length,e.match_length=0):(r=u._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++),r&&(N(e,!1),0===e.strm.avail_out))return A}return e.insert=0,t===f?(N(e,!0),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,!1),0===e.strm.avail_out)?A:I}(n,t):h[n.level].func(n,t);if(o!==O&&o!==B||(n.status=666),o===A||o===O)return 0===e.avail_out&&(n.last_flush=-1),m;if(o===I&&(1===t?u._tr_align(n):5!==t&&(u._tr_stored_block(n,0,0,!1),3===t&&(D(n.head),0===n.lookahead&&(n.strstart=0,n.block_start=0,n.insert=0))),F(e),0===e.avail_out))return n.last_flush=-1,m}return t!==f?m:n.wrap<=0?1:(2===n.wrap?(U(n,255&e.adler),U(n,e.adler>>8&255),U(n,e.adler>>16&255),U(n,e.adler>>24&255),U(n,255&e.total_in),U(n,e.total_in>>8&255),U(n,e.total_in>>16&255),U(n,e.total_in>>24&255)):(P(n,e.adler>>>16),P(n,65535&e.adler)),F(e),0<n.wrap&&(n.wrap=-n.wrap),0!==n.pending?m:1)},r.deflateEnd=function(e){var t;return e&&e.state?(t=e.state.status)!==C&&69!==t&&73!==t&&91!==t&&103!==t&&t!==E&&666!==t?R(e,_):(e.state=null,t===E?R(e,-3):m):_},r.deflateSetDictionary=function(e,t){var r,n,i,s,a,o,h,u,l=t.length;if(!e||!e.state)return _;if(2===(s=(r=e.state).wrap)||1===s&&r.status!==C||r.lookahead)return _;for(1===s&&(e.adler=d(e.adler,t,l,0)),r.wrap=0,l>=r.w_size&&(0===s&&(D(r.head),r.strstart=0,r.block_start=0,r.insert=0),u=new c.Buf8(r.w_size),c.arraySet(u,t,l-r.w_size,r.w_size,0),t=u,l=r.w_size),a=e.avail_in,o=e.next_in,h=e.input,e.avail_in=l,e.next_in=0,e.input=t,j(r);r.lookahead>=x;){for(n=r.strstart,i=r.lookahead-(x-1);r.ins_h=(r.ins_h<<r.hash_shift^r.window[n+x-1])&r.hash_mask,r.prev[n&r.w_mask]=r.head[r.ins_h],r.head[r.ins_h]=n,n++,--i;);r.strstart=n,r.lookahead=x-1,j(r)}return r.strstart+=r.lookahead,r.block_start=r.strstart,r.insert=r.lookahead,r.lookahead=0,r.match_length=r.prev_length=x-1,r.match_available=0,e.next_in=o,e.input=h,e.avail_in=a,r.wrap=s,m},r.deflateInfo="pako deflate (from Nodeca project)"},{"../utils/common":41,"./adler32":43,"./crc32":45,"./messages":51,"./trees":52}],47:[function(e,t,r){"use strict";t.exports=function(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1}},{}],48:[function(e,t,r){"use strict";t.exports=function(e,t){var r,n,i,s,a,o,h,u,l,f,c,d,p,m,_,g,b,v,y,w,k,x,S,z,C;r=e.state,n=e.next_in,z=e.input,i=n+(e.avail_in-5),s=e.next_out,C=e.output,a=s-(t-e.avail_out),o=s+(e.avail_out-257),h=r.dmax,u=r.wsize,l=r.whave,f=r.wnext,c=r.window,d=r.hold,p=r.bits,m=r.lencode,_=r.distcode,g=(1<<r.lenbits)-1,b=(1<<r.distbits)-1;e:do{p<15&&(d+=z[n++]<<p,p+=8,d+=z[n++]<<p,p+=8),v=m[d&g];t:for(;;){if(d>>>=y=v>>>24,p-=y,0===(y=v>>>16&255))C[s++]=65535&v;else{if(!(16&y)){if(0==(64&y)){v=m[(65535&v)+(d&(1<<y)-1)];continue t}if(32&y){r.mode=12;break e}e.msg="invalid literal/length code",r.mode=30;break e}w=65535&v,(y&=15)&&(p<y&&(d+=z[n++]<<p,p+=8),w+=d&(1<<y)-1,d>>>=y,p-=y),p<15&&(d+=z[n++]<<p,p+=8,d+=z[n++]<<p,p+=8),v=_[d&b];r:for(;;){if(d>>>=y=v>>>24,p-=y,!(16&(y=v>>>16&255))){if(0==(64&y)){v=_[(65535&v)+(d&(1<<y)-1)];continue r}e.msg="invalid distance code",r.mode=30;break e}if(k=65535&v,p<(y&=15)&&(d+=z[n++]<<p,(p+=8)<y&&(d+=z[n++]<<p,p+=8)),h<(k+=d&(1<<y)-1)){e.msg="invalid distance too far back",r.mode=30;break e}if(d>>>=y,p-=y,(y=s-a)<k){if(l<(y=k-y)&&r.sane){e.msg="invalid distance too far back",r.mode=30;break e}if(S=c,(x=0)===f){if(x+=u-y,y<w){for(w-=y;C[s++]=c[x++],--y;);x=s-k,S=C}}else if(f<y){if(x+=u+f-y,(y-=f)<w){for(w-=y;C[s++]=c[x++],--y;);if(x=0,f<w){for(w-=y=f;C[s++]=c[x++],--y;);x=s-k,S=C}}}else if(x+=f-y,y<w){for(w-=y;C[s++]=c[x++],--y;);x=s-k,S=C}for(;2<w;)C[s++]=S[x++],C[s++]=S[x++],C[s++]=S[x++],w-=3;w&&(C[s++]=S[x++],1<w&&(C[s++]=S[x++]))}else{for(x=s-k;C[s++]=C[x++],C[s++]=C[x++],C[s++]=C[x++],2<(w-=3););w&&(C[s++]=C[x++],1<w&&(C[s++]=C[x++]))}break}}break}}while(n<i&&s<o);n-=w=p>>3,d&=(1<<(p-=w<<3))-1,e.next_in=n,e.next_out=s,e.avail_in=n<i?i-n+5:5-(n-i),e.avail_out=s<o?o-s+257:257-(s-o),r.hold=d,r.bits=p}},{}],49:[function(e,t,r){"use strict";var I=e("../utils/common"),O=e("./adler32"),B=e("./crc32"),R=e("./inffast"),T=e("./inftrees"),D=1,F=2,N=0,U=-2,P=1,n=852,i=592;function L(e){return(e>>>24&255)+(e>>>8&65280)+((65280&e)<<8)+((255&e)<<24)}function s(){this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new I.Buf16(320),this.work=new I.Buf16(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}function a(e){var t;return e&&e.state?(t=e.state,e.total_in=e.total_out=t.total=0,e.msg="",t.wrap&&(e.adler=1&t.wrap),t.mode=P,t.last=0,t.havedict=0,t.dmax=32768,t.head=null,t.hold=0,t.bits=0,t.lencode=t.lendyn=new I.Buf32(n),t.distcode=t.distdyn=new I.Buf32(i),t.sane=1,t.back=-1,N):U}function o(e){var t;return e&&e.state?((t=e.state).wsize=0,t.whave=0,t.wnext=0,a(e)):U}function h(e,t){var r,n;return e&&e.state?(n=e.state,t<0?(r=0,t=-t):(r=1+(t>>4),t<48&&(t&=15)),t&&(t<8||15<t)?U:(null!==n.window&&n.wbits!==t&&(n.window=null),n.wrap=r,n.wbits=t,o(e))):U}function u(e,t){var r,n;return e?(n=new s,(e.state=n).window=null,(r=h(e,t))!==N&&(e.state=null),r):U}var l,f,c=!0;function j(e){if(c){var t;for(l=new I.Buf32(512),f=new I.Buf32(32),t=0;t<144;)e.lens[t++]=8;for(;t<256;)e.lens[t++]=9;for(;t<280;)e.lens[t++]=7;for(;t<288;)e.lens[t++]=8;for(T(D,e.lens,0,288,l,0,e.work,{bits:9}),t=0;t<32;)e.lens[t++]=5;T(F,e.lens,0,32,f,0,e.work,{bits:5}),c=!1}e.lencode=l,e.lenbits=9,e.distcode=f,e.distbits=5}function Z(e,t,r,n){var i,s=e.state;return null===s.window&&(s.wsize=1<<s.wbits,s.wnext=0,s.whave=0,s.window=new I.Buf8(s.wsize)),n>=s.wsize?(I.arraySet(s.window,t,r-s.wsize,s.wsize,0),s.wnext=0,s.whave=s.wsize):(n<(i=s.wsize-s.wnext)&&(i=n),I.arraySet(s.window,t,r-n,i,s.wnext),(n-=i)?(I.arraySet(s.window,t,r-n,n,0),s.wnext=n,s.whave=s.wsize):(s.wnext+=i,s.wnext===s.wsize&&(s.wnext=0),s.whave<s.wsize&&(s.whave+=i))),0}r.inflateReset=o,r.inflateReset2=h,r.inflateResetKeep=a,r.inflateInit=function(e){return u(e,15)},r.inflateInit2=u,r.inflate=function(e,t){var r,n,i,s,a,o,h,u,l,f,c,d,p,m,_,g,b,v,y,w,k,x,S,z,C=0,E=new I.Buf8(4),A=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];if(!e||!e.state||!e.output||!e.input&&0!==e.avail_in)return U;12===(r=e.state).mode&&(r.mode=13),a=e.next_out,i=e.output,h=e.avail_out,s=e.next_in,n=e.input,o=e.avail_in,u=r.hold,l=r.bits,f=o,c=h,x=N;e:for(;;)switch(r.mode){case P:if(0===r.wrap){r.mode=13;break}for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(2&r.wrap&&35615===u){E[r.check=0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0),l=u=0,r.mode=2;break}if(r.flags=0,r.head&&(r.head.done=!1),!(1&r.wrap)||(((255&u)<<8)+(u>>8))%31){e.msg="incorrect header check",r.mode=30;break}if(8!=(15&u)){e.msg="unknown compression method",r.mode=30;break}if(l-=4,k=8+(15&(u>>>=4)),0===r.wbits)r.wbits=k;else if(k>r.wbits){e.msg="invalid window size",r.mode=30;break}r.dmax=1<<k,e.adler=r.check=1,r.mode=512&u?10:12,l=u=0;break;case 2:for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(r.flags=u,8!=(255&r.flags)){e.msg="unknown compression method",r.mode=30;break}if(57344&r.flags){e.msg="unknown header flags set",r.mode=30;break}r.head&&(r.head.text=u>>8&1),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0,r.mode=3;case 3:for(;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.head&&(r.head.time=u),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,E[2]=u>>>16&255,E[3]=u>>>24&255,r.check=B(r.check,E,4,0)),l=u=0,r.mode=4;case 4:for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.head&&(r.head.xflags=255&u,r.head.os=u>>8),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0,r.mode=5;case 5:if(1024&r.flags){for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.length=u,r.head&&(r.head.extra_len=u),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0}else r.head&&(r.head.extra=null);r.mode=6;case 6:if(1024&r.flags&&(o<(d=r.length)&&(d=o),d&&(r.head&&(k=r.head.extra_len-r.length,r.head.extra||(r.head.extra=new Array(r.head.extra_len)),I.arraySet(r.head.extra,n,s,d,k)),512&r.flags&&(r.check=B(r.check,n,d,s)),o-=d,s+=d,r.length-=d),r.length))break e;r.length=0,r.mode=7;case 7:if(2048&r.flags){if(0===o)break e;for(d=0;k=n[s+d++],r.head&&k&&r.length<65536&&(r.head.name+=String.fromCharCode(k)),k&&d<o;);if(512&r.flags&&(r.check=B(r.check,n,d,s)),o-=d,s+=d,k)break e}else r.head&&(r.head.name=null);r.length=0,r.mode=8;case 8:if(4096&r.flags){if(0===o)break e;for(d=0;k=n[s+d++],r.head&&k&&r.length<65536&&(r.head.comment+=String.fromCharCode(k)),k&&d<o;);if(512&r.flags&&(r.check=B(r.check,n,d,s)),o-=d,s+=d,k)break e}else r.head&&(r.head.comment=null);r.mode=9;case 9:if(512&r.flags){for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(u!==(65535&r.check)){e.msg="header crc mismatch",r.mode=30;break}l=u=0}r.head&&(r.head.hcrc=r.flags>>9&1,r.head.done=!0),e.adler=r.check=0,r.mode=12;break;case 10:for(;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}e.adler=r.check=L(u),l=u=0,r.mode=11;case 11:if(0===r.havedict)return e.next_out=a,e.avail_out=h,e.next_in=s,e.avail_in=o,r.hold=u,r.bits=l,2;e.adler=r.check=1,r.mode=12;case 12:if(5===t||6===t)break e;case 13:if(r.last){u>>>=7&l,l-=7&l,r.mode=27;break}for(;l<3;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}switch(r.last=1&u,l-=1,3&(u>>>=1)){case 0:r.mode=14;break;case 1:if(j(r),r.mode=20,6!==t)break;u>>>=2,l-=2;break e;case 2:r.mode=17;break;case 3:e.msg="invalid block type",r.mode=30}u>>>=2,l-=2;break;case 14:for(u>>>=7&l,l-=7&l;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if((65535&u)!=(u>>>16^65535)){e.msg="invalid stored block lengths",r.mode=30;break}if(r.length=65535&u,l=u=0,r.mode=15,6===t)break e;case 15:r.mode=16;case 16:if(d=r.length){if(o<d&&(d=o),h<d&&(d=h),0===d)break e;I.arraySet(i,n,s,d,a),o-=d,s+=d,h-=d,a+=d,r.length-=d;break}r.mode=12;break;case 17:for(;l<14;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(r.nlen=257+(31&u),u>>>=5,l-=5,r.ndist=1+(31&u),u>>>=5,l-=5,r.ncode=4+(15&u),u>>>=4,l-=4,286<r.nlen||30<r.ndist){e.msg="too many length or distance symbols",r.mode=30;break}r.have=0,r.mode=18;case 18:for(;r.have<r.ncode;){for(;l<3;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.lens[A[r.have++]]=7&u,u>>>=3,l-=3}for(;r.have<19;)r.lens[A[r.have++]]=0;if(r.lencode=r.lendyn,r.lenbits=7,S={bits:r.lenbits},x=T(0,r.lens,0,19,r.lencode,0,r.work,S),r.lenbits=S.bits,x){e.msg="invalid code lengths set",r.mode=30;break}r.have=0,r.mode=19;case 19:for(;r.have<r.nlen+r.ndist;){for(;g=(C=r.lencode[u&(1<<r.lenbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(b<16)u>>>=_,l-=_,r.lens[r.have++]=b;else{if(16===b){for(z=_+2;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(u>>>=_,l-=_,0===r.have){e.msg="invalid bit length repeat",r.mode=30;break}k=r.lens[r.have-1],d=3+(3&u),u>>>=2,l-=2}else if(17===b){for(z=_+3;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}l-=_,k=0,d=3+(7&(u>>>=_)),u>>>=3,l-=3}else{for(z=_+7;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}l-=_,k=0,d=11+(127&(u>>>=_)),u>>>=7,l-=7}if(r.have+d>r.nlen+r.ndist){e.msg="invalid bit length repeat",r.mode=30;break}for(;d--;)r.lens[r.have++]=k}}if(30===r.mode)break;if(0===r.lens[256]){e.msg="invalid code -- missing end-of-block",r.mode=30;break}if(r.lenbits=9,S={bits:r.lenbits},x=T(D,r.lens,0,r.nlen,r.lencode,0,r.work,S),r.lenbits=S.bits,x){e.msg="invalid literal/lengths set",r.mode=30;break}if(r.distbits=6,r.distcode=r.distdyn,S={bits:r.distbits},x=T(F,r.lens,r.nlen,r.ndist,r.distcode,0,r.work,S),r.distbits=S.bits,x){e.msg="invalid distances set",r.mode=30;break}if(r.mode=20,6===t)break e;case 20:r.mode=21;case 21:if(6<=o&&258<=h){e.next_out=a,e.avail_out=h,e.next_in=s,e.avail_in=o,r.hold=u,r.bits=l,R(e,c),a=e.next_out,i=e.output,h=e.avail_out,s=e.next_in,n=e.input,o=e.avail_in,u=r.hold,l=r.bits,12===r.mode&&(r.back=-1);break}for(r.back=0;g=(C=r.lencode[u&(1<<r.lenbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(g&&0==(240&g)){for(v=_,y=g,w=b;g=(C=r.lencode[w+((u&(1<<v+y)-1)>>v)])>>>16&255,b=65535&C,!(v+(_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}u>>>=v,l-=v,r.back+=v}if(u>>>=_,l-=_,r.back+=_,r.length=b,0===g){r.mode=26;break}if(32&g){r.back=-1,r.mode=12;break}if(64&g){e.msg="invalid literal/length code",r.mode=30;break}r.extra=15&g,r.mode=22;case 22:if(r.extra){for(z=r.extra;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.length+=u&(1<<r.extra)-1,u>>>=r.extra,l-=r.extra,r.back+=r.extra}r.was=r.length,r.mode=23;case 23:for(;g=(C=r.distcode[u&(1<<r.distbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(0==(240&g)){for(v=_,y=g,w=b;g=(C=r.distcode[w+((u&(1<<v+y)-1)>>v)])>>>16&255,b=65535&C,!(v+(_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}u>>>=v,l-=v,r.back+=v}if(u>>>=_,l-=_,r.back+=_,64&g){e.msg="invalid distance code",r.mode=30;break}r.offset=b,r.extra=15&g,r.mode=24;case 24:if(r.extra){for(z=r.extra;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.offset+=u&(1<<r.extra)-1,u>>>=r.extra,l-=r.extra,r.back+=r.extra}if(r.offset>r.dmax){e.msg="invalid distance too far back",r.mode=30;break}r.mode=25;case 25:if(0===h)break e;if(d=c-h,r.offset>d){if((d=r.offset-d)>r.whave&&r.sane){e.msg="invalid distance too far back",r.mode=30;break}p=d>r.wnext?(d-=r.wnext,r.wsize-d):r.wnext-d,d>r.length&&(d=r.length),m=r.window}else m=i,p=a-r.offset,d=r.length;for(h<d&&(d=h),h-=d,r.length-=d;i[a++]=m[p++],--d;);0===r.length&&(r.mode=21);break;case 26:if(0===h)break e;i[a++]=r.length,h--,r.mode=21;break;case 27:if(r.wrap){for(;l<32;){if(0===o)break e;o--,u|=n[s++]<<l,l+=8}if(c-=h,e.total_out+=c,r.total+=c,c&&(e.adler=r.check=r.flags?B(r.check,i,c,a-c):O(r.check,i,c,a-c)),c=h,(r.flags?u:L(u))!==r.check){e.msg="incorrect data check",r.mode=30;break}l=u=0}r.mode=28;case 28:if(r.wrap&&r.flags){for(;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(u!==(4294967295&r.total)){e.msg="incorrect length check",r.mode=30;break}l=u=0}r.mode=29;case 29:x=1;break e;case 30:x=-3;break e;case 31:return-4;case 32:default:return U}return e.next_out=a,e.avail_out=h,e.next_in=s,e.avail_in=o,r.hold=u,r.bits=l,(r.wsize||c!==e.avail_out&&r.mode<30&&(r.mode<27||4!==t))&&Z(e,e.output,e.next_out,c-e.avail_out)?(r.mode=31,-4):(f-=e.avail_in,c-=e.avail_out,e.total_in+=f,e.total_out+=c,r.total+=c,r.wrap&&c&&(e.adler=r.check=r.flags?B(r.check,i,c,e.next_out-c):O(r.check,i,c,e.next_out-c)),e.data_type=r.bits+(r.last?64:0)+(12===r.mode?128:0)+(20===r.mode||15===r.mode?256:0),(0==f&&0===c||4===t)&&x===N&&(x=-5),x)},r.inflateEnd=function(e){if(!e||!e.state)return U;var t=e.state;return t.window&&(t.window=null),e.state=null,N},r.inflateGetHeader=function(e,t){var r;return e&&e.state?0==(2&(r=e.state).wrap)?U:((r.head=t).done=!1,N):U},r.inflateSetDictionary=function(e,t){var r,n=t.length;return e&&e.state?0!==(r=e.state).wrap&&11!==r.mode?U:11===r.mode&&O(1,t,n,0)!==r.check?-3:Z(e,t,n,n)?(r.mode=31,-4):(r.havedict=1,N):U},r.inflateInfo="pako inflate (from Nodeca project)"},{"../utils/common":41,"./adler32":43,"./crc32":45,"./inffast":48,"./inftrees":50}],50:[function(e,t,r){"use strict";var D=e("../utils/common"),F=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],N=[16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78],U=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0],P=[16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64];t.exports=function(e,t,r,n,i,s,a,o){var h,u,l,f,c,d,p,m,_,g=o.bits,b=0,v=0,y=0,w=0,k=0,x=0,S=0,z=0,C=0,E=0,A=null,I=0,O=new D.Buf16(16),B=new D.Buf16(16),R=null,T=0;for(b=0;b<=15;b++)O[b]=0;for(v=0;v<n;v++)O[t[r+v]]++;for(k=g,w=15;1<=w&&0===O[w];w--);if(w<k&&(k=w),0===w)return i[s++]=20971520,i[s++]=20971520,o.bits=1,0;for(y=1;y<w&&0===O[y];y++);for(k<y&&(k=y),b=z=1;b<=15;b++)if(z<<=1,(z-=O[b])<0)return-1;if(0<z&&(0===e||1!==w))return-1;for(B[1]=0,b=1;b<15;b++)B[b+1]=B[b]+O[b];for(v=0;v<n;v++)0!==t[r+v]&&(a[B[t[r+v]]++]=v);if(d=0===e?(A=R=a,19):1===e?(A=F,I-=257,R=N,T-=257,256):(A=U,R=P,-1),b=y,c=s,S=v=E=0,l=-1,f=(C=1<<(x=k))-1,1===e&&852<C||2===e&&592<C)return 1;for(;;){for(p=b-S,_=a[v]<d?(m=0,a[v]):a[v]>d?(m=R[T+a[v]],A[I+a[v]]):(m=96,0),h=1<<b-S,y=u=1<<x;i[c+(E>>S)+(u-=h)]=p<<24|m<<16|_|0,0!==u;);for(h=1<<b-1;E&h;)h>>=1;if(0!==h?(E&=h-1,E+=h):E=0,v++,0==--O[b]){if(b===w)break;b=t[r+a[v]]}if(k<b&&(E&f)!==l){for(0===S&&(S=k),c+=y,z=1<<(x=b-S);x+S<w&&!((z-=O[x+S])<=0);)x++,z<<=1;if(C+=1<<x,1===e&&852<C||2===e&&592<C)return 1;i[l=E&f]=k<<24|x<<16|c-s|0}}return 0!==E&&(i[c+E]=b-S<<24|64<<16|0),o.bits=k,0}},{"../utils/common":41}],51:[function(e,t,r){"use strict";t.exports={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"}},{}],52:[function(e,t,r){"use strict";var i=e("../utils/common"),o=0,h=1;function n(e){for(var t=e.length;0<=--t;)e[t]=0}var s=0,a=29,u=256,l=u+1+a,f=30,c=19,_=2*l+1,g=15,d=16,p=7,m=256,b=16,v=17,y=18,w=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],k=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],x=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7],S=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],z=new Array(2*(l+2));n(z);var C=new Array(2*f);n(C);var E=new Array(512);n(E);var A=new Array(256);n(A);var I=new Array(a);n(I);var O,B,R,T=new Array(f);function D(e,t,r,n,i){this.static_tree=e,this.extra_bits=t,this.extra_base=r,this.elems=n,this.max_length=i,this.has_stree=e&&e.length}function F(e,t){this.dyn_tree=e,this.max_code=0,this.stat_desc=t}function N(e){return e<256?E[e]:E[256+(e>>>7)]}function U(e,t){e.pending_buf[e.pending++]=255&t,e.pending_buf[e.pending++]=t>>>8&255}function P(e,t,r){e.bi_valid>d-r?(e.bi_buf|=t<<e.bi_valid&65535,U(e,e.bi_buf),e.bi_buf=t>>d-e.bi_valid,e.bi_valid+=r-d):(e.bi_buf|=t<<e.bi_valid&65535,e.bi_valid+=r)}function L(e,t,r){P(e,r[2*t],r[2*t+1])}function j(e,t){for(var r=0;r|=1&e,e>>>=1,r<<=1,0<--t;);return r>>>1}function Z(e,t,r){var n,i,s=new Array(g+1),a=0;for(n=1;n<=g;n++)s[n]=a=a+r[n-1]<<1;for(i=0;i<=t;i++){var o=e[2*i+1];0!==o&&(e[2*i]=j(s[o]++,o))}}function W(e){var t;for(t=0;t<l;t++)e.dyn_ltree[2*t]=0;for(t=0;t<f;t++)e.dyn_dtree[2*t]=0;for(t=0;t<c;t++)e.bl_tree[2*t]=0;e.dyn_ltree[2*m]=1,e.opt_len=e.static_len=0,e.last_lit=e.matches=0}function M(e){8<e.bi_valid?U(e,e.bi_buf):0<e.bi_valid&&(e.pending_buf[e.pending++]=e.bi_buf),e.bi_buf=0,e.bi_valid=0}function H(e,t,r,n){var i=2*t,s=2*r;return e[i]<e[s]||e[i]===e[s]&&n[t]<=n[r]}function G(e,t,r){for(var n=e.heap[r],i=r<<1;i<=e.heap_len&&(i<e.heap_len&&H(t,e.heap[i+1],e.heap[i],e.depth)&&i++,!H(t,n,e.heap[i],e.depth));)e.heap[r]=e.heap[i],r=i,i<<=1;e.heap[r]=n}function K(e,t,r){var n,i,s,a,o=0;if(0!==e.last_lit)for(;n=e.pending_buf[e.d_buf+2*o]<<8|e.pending_buf[e.d_buf+2*o+1],i=e.pending_buf[e.l_buf+o],o++,0===n?L(e,i,t):(L(e,(s=A[i])+u+1,t),0!==(a=w[s])&&P(e,i-=I[s],a),L(e,s=N(--n),r),0!==(a=k[s])&&P(e,n-=T[s],a)),o<e.last_lit;);L(e,m,t)}function Y(e,t){var r,n,i,s=t.dyn_tree,a=t.stat_desc.static_tree,o=t.stat_desc.has_stree,h=t.stat_desc.elems,u=-1;for(e.heap_len=0,e.heap_max=_,r=0;r<h;r++)0!==s[2*r]?(e.heap[++e.heap_len]=u=r,e.depth[r]=0):s[2*r+1]=0;for(;e.heap_len<2;)s[2*(i=e.heap[++e.heap_len]=u<2?++u:0)]=1,e.depth[i]=0,e.opt_len--,o&&(e.static_len-=a[2*i+1]);for(t.max_code=u,r=e.heap_len>>1;1<=r;r--)G(e,s,r);for(i=h;r=e.heap[1],e.heap[1]=e.heap[e.heap_len--],G(e,s,1),n=e.heap[1],e.heap[--e.heap_max]=r,e.heap[--e.heap_max]=n,s[2*i]=s[2*r]+s[2*n],e.depth[i]=(e.depth[r]>=e.depth[n]?e.depth[r]:e.depth[n])+1,s[2*r+1]=s[2*n+1]=i,e.heap[1]=i++,G(e,s,1),2<=e.heap_len;);e.heap[--e.heap_max]=e.heap[1],function(e,t){var r,n,i,s,a,o,h=t.dyn_tree,u=t.max_code,l=t.stat_desc.static_tree,f=t.stat_desc.has_stree,c=t.stat_desc.extra_bits,d=t.stat_desc.extra_base,p=t.stat_desc.max_length,m=0;for(s=0;s<=g;s++)e.bl_count[s]=0;for(h[2*e.heap[e.heap_max]+1]=0,r=e.heap_max+1;r<_;r++)p<(s=h[2*h[2*(n=e.heap[r])+1]+1]+1)&&(s=p,m++),h[2*n+1]=s,u<n||(e.bl_count[s]++,a=0,d<=n&&(a=c[n-d]),o=h[2*n],e.opt_len+=o*(s+a),f&&(e.static_len+=o*(l[2*n+1]+a)));if(0!==m){do{for(s=p-1;0===e.bl_count[s];)s--;e.bl_count[s]--,e.bl_count[s+1]+=2,e.bl_count[p]--,m-=2}while(0<m);for(s=p;0!==s;s--)for(n=e.bl_count[s];0!==n;)u<(i=e.heap[--r])||(h[2*i+1]!==s&&(e.opt_len+=(s-h[2*i+1])*h[2*i],h[2*i+1]=s),n--)}}(e,t),Z(s,u,e.bl_count)}function X(e,t,r){var n,i,s=-1,a=t[1],o=0,h=7,u=4;for(0===a&&(h=138,u=3),t[2*(r+1)+1]=65535,n=0;n<=r;n++)i=a,a=t[2*(n+1)+1],++o<h&&i===a||(o<u?e.bl_tree[2*i]+=o:0!==i?(i!==s&&e.bl_tree[2*i]++,e.bl_tree[2*b]++):o<=10?e.bl_tree[2*v]++:e.bl_tree[2*y]++,s=i,u=(o=0)===a?(h=138,3):i===a?(h=6,3):(h=7,4))}function V(e,t,r){var n,i,s=-1,a=t[1],o=0,h=7,u=4;for(0===a&&(h=138,u=3),n=0;n<=r;n++)if(i=a,a=t[2*(n+1)+1],!(++o<h&&i===a)){if(o<u)for(;L(e,i,e.bl_tree),0!=--o;);else 0!==i?(i!==s&&(L(e,i,e.bl_tree),o--),L(e,b,e.bl_tree),P(e,o-3,2)):o<=10?(L(e,v,e.bl_tree),P(e,o-3,3)):(L(e,y,e.bl_tree),P(e,o-11,7));s=i,u=(o=0)===a?(h=138,3):i===a?(h=6,3):(h=7,4)}}n(T);var q=!1;function J(e,t,r,n){P(e,(s<<1)+(n?1:0),3),function(e,t,r,n){M(e),n&&(U(e,r),U(e,~r)),i.arraySet(e.pending_buf,e.window,t,r,e.pending),e.pending+=r}(e,t,r,!0)}r._tr_init=function(e){q||(function(){var e,t,r,n,i,s=new Array(g+1);for(n=r=0;n<a-1;n++)for(I[n]=r,e=0;e<1<<w[n];e++)A[r++]=n;for(A[r-1]=n,n=i=0;n<16;n++)for(T[n]=i,e=0;e<1<<k[n];e++)E[i++]=n;for(i>>=7;n<f;n++)for(T[n]=i<<7,e=0;e<1<<k[n]-7;e++)E[256+i++]=n;for(t=0;t<=g;t++)s[t]=0;for(e=0;e<=143;)z[2*e+1]=8,e++,s[8]++;for(;e<=255;)z[2*e+1]=9,e++,s[9]++;for(;e<=279;)z[2*e+1]=7,e++,s[7]++;for(;e<=287;)z[2*e+1]=8,e++,s[8]++;for(Z(z,l+1,s),e=0;e<f;e++)C[2*e+1]=5,C[2*e]=j(e,5);O=new D(z,w,u+1,l,g),B=new D(C,k,0,f,g),R=new D(new Array(0),x,0,c,p)}(),q=!0),e.l_desc=new F(e.dyn_ltree,O),e.d_desc=new F(e.dyn_dtree,B),e.bl_desc=new F(e.bl_tree,R),e.bi_buf=0,e.bi_valid=0,W(e)},r._tr_stored_block=J,r._tr_flush_block=function(e,t,r,n){var i,s,a=0;0<e.level?(2===e.strm.data_type&&(e.strm.data_type=function(e){var t,r=4093624447;for(t=0;t<=31;t++,r>>>=1)if(1&r&&0!==e.dyn_ltree[2*t])return o;if(0!==e.dyn_ltree[18]||0!==e.dyn_ltree[20]||0!==e.dyn_ltree[26])return h;for(t=32;t<u;t++)if(0!==e.dyn_ltree[2*t])return h;return o}(e)),Y(e,e.l_desc),Y(e,e.d_desc),a=function(e){var t;for(X(e,e.dyn_ltree,e.l_desc.max_code),X(e,e.dyn_dtree,e.d_desc.max_code),Y(e,e.bl_desc),t=c-1;3<=t&&0===e.bl_tree[2*S[t]+1];t--);return e.opt_len+=3*(t+1)+5+5+4,t}(e),i=e.opt_len+3+7>>>3,(s=e.static_len+3+7>>>3)<=i&&(i=s)):i=s=r+5,r+4<=i&&-1!==t?J(e,t,r,n):4===e.strategy||s===i?(P(e,2+(n?1:0),3),K(e,z,C)):(P(e,4+(n?1:0),3),function(e,t,r,n){var i;for(P(e,t-257,5),P(e,r-1,5),P(e,n-4,4),i=0;i<n;i++)P(e,e.bl_tree[2*S[i]+1],3);V(e,e.dyn_ltree,t-1),V(e,e.dyn_dtree,r-1)}(e,e.l_desc.max_code+1,e.d_desc.max_code+1,a+1),K(e,e.dyn_ltree,e.dyn_dtree)),W(e),n&&M(e)},r._tr_tally=function(e,t,r){return e.pending_buf[e.d_buf+2*e.last_lit]=t>>>8&255,e.pending_buf[e.d_buf+2*e.last_lit+1]=255&t,e.pending_buf[e.l_buf+e.last_lit]=255&r,e.last_lit++,0===t?e.dyn_ltree[2*r]++:(e.matches++,t--,e.dyn_ltree[2*(A[r]+u+1)]++,e.dyn_dtree[2*N(t)]++),e.last_lit===e.lit_bufsize-1},r._tr_align=function(e){P(e,2,3),L(e,m,z),function(e){16===e.bi_valid?(U(e,e.bi_buf),e.bi_buf=0,e.bi_valid=0):8<=e.bi_valid&&(e.pending_buf[e.pending++]=255&e.bi_buf,e.bi_buf>>=8,e.bi_valid-=8)}(e)}},{"../utils/common":41}],53:[function(e,t,r){"use strict";t.exports=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}},{}],54:[function(e,t,r){(function(e){!function(r,n){"use strict";if(!r.setImmediate){var i,s,t,a,o=1,h={},u=!1,l=r.document,e=Object.getPrototypeOf&&Object.getPrototypeOf(r);e=e&&e.setTimeout?e:r,i="[object process]"==={}.toString.call(r.process)?function(e){process.nextTick(function(){c(e)})}:function(){if(r.postMessage&&!r.importScripts){var e=!0,t=r.onmessage;return r.onmessage=function(){e=!1},r.postMessage("","*"),r.onmessage=t,e}}()?(a="setImmediate$"+Math.random()+"$",r.addEventListener?r.addEventListener("message",d,!1):r.attachEvent("onmessage",d),function(e){r.postMessage(a+e,"*")}):r.MessageChannel?((t=new MessageChannel).port1.onmessage=function(e){c(e.data)},function(e){t.port2.postMessage(e)}):l&&"onreadystatechange"in l.createElement("script")?(s=l.documentElement,function(e){var t=l.createElement("script");t.onreadystatechange=function(){c(e),t.onreadystatechange=null,s.removeChild(t),t=null},s.appendChild(t)}):function(e){setTimeout(c,0,e)},e.setImmediate=function(e){"function"!=typeof e&&(e=new Function(""+e));for(var t=new Array(arguments.length-1),r=0;r<t.length;r++)t[r]=arguments[r+1];var n={callback:e,args:t};return h[o]=n,i(o),o++},e.clearImmediate=f}function f(e){delete h[e]}function c(e){if(u)setTimeout(c,0,e);else{var t=h[e];if(t){u=!0;try{!function(e){var t=e.callback,r=e.args;switch(r.length){case 0:t();break;case 1:t(r[0]);break;case 2:t(r[0],r[1]);break;case 3:t(r[0],r[1],r[2]);break;default:t.apply(n,r)}}(t)}finally{f(e),u=!1}}}}function d(e){e.source===r&&"string"==typeof e.data&&0===e.data.indexOf(a)&&c(+e.data.slice(a.length))}}("undefined"==typeof self?void 0===e?this:e:self)}).call(this,"undefined"!=typeof __webpack_require__.g?__webpack_require__.g:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}]},{},[10])(10)});

/***/ }),

/***/ 746:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*global module*/
/*global require*/
var Solution = __webpack_require__(824);

function MilpSolution(tableau, evaluation, feasible, bounded, branchAndCutIterations) {
    Solution.call(this, tableau, evaluation, feasible, bounded);
    this.iter = branchAndCutIterations;
}
module.exports = MilpSolution;
MilpSolution.prototype = Object.create(Solution.prototype);
MilpSolution.constructor = MilpSolution;


/***/ }),

/***/ 773:
/***/ ((module) => {

/*global describe*/
/*global require*/
/*global module*/
/*global it*/
/*global console*/
/*global process*/

//-------------------------------------------------------------------
//-------------------------------------------------------------------
function Variable(id, cost, index, priority) {
    this.id = id;
    this.cost = cost;
    this.index = index;
    this.value = 0;
    this.priority = priority;
}

function IntegerVariable(id, cost, index, priority) {
    Variable.call(this, id, cost, index, priority);
}
IntegerVariable.prototype.isInteger = true;

function SlackVariable(id, index) {
    Variable.call(this, id, 0, index, 0);
}
SlackVariable.prototype.isSlack = true;

//-------------------------------------------------------------------
//-------------------------------------------------------------------
function Term(variable, coefficient) {
    this.variable = variable;
    this.coefficient = coefficient;
}

function createRelaxationVariable(model, weight, priority) {
    if (priority === 0 || priority === "required") {
        return null;
    }

    weight = weight || 1;
    priority = priority || 1;

    if (model.isMinimization === false) {
        weight = -weight;
    }

    return model.addVariable(weight, "r" + (model.relaxationIndex++), false, false, priority);
}

//-------------------------------------------------------------------
//-------------------------------------------------------------------
function Constraint(rhs, isUpperBound, index, model) {
    this.slack = new SlackVariable("s" + index, index);
    this.index = index;
    this.model = model;
    this.rhs = rhs;
    this.isUpperBound = isUpperBound;

    this.terms = [];
    this.termsByVarIndex = {};

    // Error variable in case the constraint is relaxed
    this.relaxation = null;
}

Constraint.prototype.addTerm = function (coefficient, variable) {
    var varIndex = variable.index;
    var term = this.termsByVarIndex[varIndex];
    if (term === undefined) {
        // No term for given variable
        term = new Term(variable, coefficient);
        this.termsByVarIndex[varIndex] = term;
        this.terms.push(term);
        if (this.isUpperBound === true) {
            coefficient = -coefficient;
        }
        this.model.updateConstraintCoefficient(this, variable, coefficient);
    } else {
        // Term for given variable already exists
        // updating its coefficient
        var newCoefficient = term.coefficient + coefficient;
        this.setVariableCoefficient(newCoefficient, variable);
    }

    return this;
};

Constraint.prototype.removeTerm = function (term) {
    // TODO
    return this;
};

Constraint.prototype.setRightHandSide = function (newRhs) {
    if (newRhs !== this.rhs) {
        var difference = newRhs - this.rhs;
        if (this.isUpperBound === true) {
            difference = -difference;
        }

        this.rhs = newRhs;
        this.model.updateRightHandSide(this, difference);
    }

    return this;
};

Constraint.prototype.setVariableCoefficient = function (newCoefficient, variable) {
    var varIndex = variable.index;
    if (varIndex === -1) {
        console.warn("[Constraint.setVariableCoefficient] Trying to change coefficient of inexistant variable.");
        return;
    }

    var term = this.termsByVarIndex[varIndex];
    if (term === undefined) {
        // No term for given variable
        this.addTerm(newCoefficient, variable);
    } else {
        // Term for given variable already exists
        // updating its coefficient if changed
        if (newCoefficient !== term.coefficient) {
            var difference = newCoefficient - term.coefficient;
            if (this.isUpperBound === true) {
                difference = -difference;
            }

            term.coefficient = newCoefficient;
            this.model.updateConstraintCoefficient(this, variable, difference);
        }
    }

    return this;
};

Constraint.prototype.relax = function (weight, priority) {
    this.relaxation = createRelaxationVariable(this.model, weight, priority);
    this._relax(this.relaxation);
};

Constraint.prototype._relax = function (relaxationVariable) {
    if (relaxationVariable === null) {
        // Relaxation variable not created, priority was probably "required"
        return;
    }

    if (this.isUpperBound) {
        this.setVariableCoefficient(-1, relaxationVariable);
    } else {
        this.setVariableCoefficient(1, relaxationVariable);
    }
};

//-------------------------------------------------------------------
//-------------------------------------------------------------------
function Equality(constraintUpper, constraintLower) {
    this.upperBound = constraintUpper;
    this.lowerBound = constraintLower;
    this.model = constraintUpper.model;
    this.rhs = constraintUpper.rhs;
    this.relaxation = null;
}

Equality.prototype.isEquality = true;

Equality.prototype.addTerm = function (coefficient, variable) {
    this.upperBound.addTerm(coefficient, variable);
    this.lowerBound.addTerm(coefficient, variable);
    return this;
};

Equality.prototype.removeTerm = function (term) {
    this.upperBound.removeTerm(term);
    this.lowerBound.removeTerm(term);
    return this;
};

Equality.prototype.setRightHandSide = function (rhs) {
    this.upperBound.setRightHandSide(rhs);
    this.lowerBound.setRightHandSide(rhs);
    this.rhs = rhs;
};

Equality.prototype.relax = function (weight, priority) {
    this.relaxation = createRelaxationVariable(this.model, weight, priority);
    this.upperBound.relaxation = this.relaxation;
    this.upperBound._relax(this.relaxation);
    this.lowerBound.relaxation = this.relaxation;
    this.lowerBound._relax(this.relaxation);
};


module.exports = {
    Constraint: Constraint,
    Variable: Variable,
    IntegerVariable: IntegerVariable,
    SlackVariable: SlackVariable,
    Equality: Equality,
    Term: Term
};


/***/ }),

/***/ 788:
/***/ ((module) => {

/*global describe*/
/*global require*/
/*global module*/
/*global it*/
/*global console*/
/*global process*/
/*jshint -W083 */

 /*************************************************************
 * Method: to_JSON
 * Scope: Public:
 * Agruments: input: Whatever the user gives us
 * Purpose: Convert an unfriendly formatted LP
 *          into something that our library can
 *          work with
 **************************************************************/
function to_JSON(input){
    var rxo = {
        /* jshint ignore:start */
        "is_blank": /^\W{0,}$/,
        "is_objective": /(max|min)(imize){0,}\:/i,
        "is_int": /^(?!\/\*)\W{0,}int/i,
        "is_bin": /^(?!\/\*)\W{0,}bin/i,
        "is_constraint": /(\>|\<){0,}\=/i,
        "is_unrestricted": /^\S{0,}unrestricted/i,
        "parse_lhs":  /(\-|\+){0,1}\s{0,1}\d{0,}\.{0,}\d{0,}\s{0,}[A-Za-z]\S{0,}/gi,
        "parse_rhs": /(\-|\+){0,1}\d{1,}\.{0,}\d{0,}\W{0,}\;{0,1}$/i,
        "parse_dir": /(\>|\<){0,}\=/gi,
        "parse_int": /[^\s|^\,]+/gi,
        "parse_bin": /[^\s|^\,]+/gi,
        "get_num": /(\-|\+){0,1}(\W|^)\d+\.{0,1}\d{0,}/g,
        "get_word": /[A-Za-z].*/
        /* jshint ignore:end */
    },
    model = {
        "opType": "",
        "optimize": "_obj",
        "constraints": {},
        "variables": {}
    },
    constraints = {
        ">=": "min",
        "<=": "max",
        "=": "equal"
    },
    tmp = "", tst = 0, ary = null, hldr = "", hldr2 = "",
    constraint = "", rhs = 0;

    // Handle input if its coming
    // to us as a hard string
    // instead of as an array of
    // strings
    if(typeof input === "string"){
        input = input.split("\n");
    }

    // Start iterating over the rows
    // to see what all we have
    for(var i = 0; i < input.length; i++){

        constraint = "__" + i;

        // Get the string we're working with
        tmp = input[i];

        // Set the test = 0
        tst = 0;

        // Reset the array
        ary = null;

        // Test to see if we're the objective
        if(rxo.is_objective.test(tmp)){
            // Set up in model the opType
            model.opType = tmp.match(/(max|min)/gi)[0];

            // Pull apart lhs
            ary = tmp.match(rxo.parse_lhs).map(function(d){
                return d.replace(/\s+/,"");
            }).slice(1);



            // *** STEP 1 *** ///
            // Get the variables out
            ary.forEach(function(d){

                // Get the number if its there
                hldr = d.match(rxo.get_num);

                // If it isn't a number, it might
                // be a standalone variable
                if(hldr === null){
                    if(d.substr(0,1) === "-"){
                        hldr = -1;
                    } else {
                        hldr = 1;
                    }
                } else {
                    hldr = hldr[0];
                }

                hldr = parseFloat(hldr);

                // Get the variable type
                hldr2 = d.match(rxo.get_word)[0].replace(/\;$/,"");

                // Make sure the variable is in the model
                model.variables[hldr2] = model.variables[hldr2] || {};
                model.variables[hldr2]._obj = hldr;

            });
        ////////////////////////////////////
        }else if(rxo.is_int.test(tmp)){
            // Get the array of ints
            ary = tmp.match(rxo.parse_int).slice(1);

            // Since we have an int, our model should too
            model.ints = model.ints || {};

            ary.forEach(function(d){
                d = d.replace(";","");
                model.ints[d] = 1;
            });
        ////////////////////////////////////
        } else if(rxo.is_bin.test(tmp)){
            // Get the array of bins
            ary = tmp.match(rxo.parse_bin).slice(1);

            // Since we have an binary, our model should too
            model.binaries = model.binaries || {};

            ary.forEach(function(d){
                d = d.replace(";","");
                model.binaries[d] = 1;
            });
        ////////////////////////////////////
        } else if(rxo.is_constraint.test(tmp)){
            var separatorIndex = tmp.indexOf(":");
            var constraintExpression = (separatorIndex === -1) ? tmp : tmp.slice(separatorIndex + 1);

            // Pull apart lhs
            ary = constraintExpression.match(rxo.parse_lhs).map(function(d){
                return d.replace(/\s+/,"");
            });

            // *** STEP 1 *** ///
            // Get the variables out
            ary.forEach(function(d){
                // Get the number if its there
                hldr = d.match(rxo.get_num);

                if(hldr === null){
                    if(d.substr(0,1) === "-"){
                        hldr = -1;
                    } else {
                        hldr = 1;
                    }
                } else {
                    hldr = hldr[0];
                }

                hldr = parseFloat(hldr);


                // Get the variable name
                hldr2 = d.match(rxo.get_word)[0];

                // Make sure the variable is in the model
                model.variables[hldr2] = model.variables[hldr2] || {};
                model.variables[hldr2][constraint] = hldr;

            });

            // *** STEP 2 *** ///
            // Get the RHS out
            rhs = parseFloat(tmp.match(rxo.parse_rhs)[0]);

            // *** STEP 3 *** ///
            // Get the Constrainer out
            tmp = constraints[tmp.match(rxo.parse_dir)[0]];
            model.constraints[constraint] = model.constraints[constraint] || {};
            model.constraints[constraint][tmp] = rhs;
        ////////////////////////////////////
        } else if(rxo.is_unrestricted.test(tmp)){
            // Get the array of unrestricted
            ary = tmp.match(rxo.parse_int).slice(1);

            // Since we have an int, our model should too
            model.unrestricted = model.unrestricted || {};

            ary.forEach(function(d){
                d = d.replace(";","");
                model.unrestricted[d] = 1;
            });
        }
    }
    return model;
}


 /*************************************************************
 * Method: from_JSON
 * Scope: Public:
 * Agruments: model: The model we want solver to operate on
 * Purpose: Convert a friendly JSON model into a model for a
 *          real solving library...in this case
 *          lp_solver
 **************************************************************/
function from_JSON(model){
    // Make sure we at least have a model
    if (!model) {
        throw new Error("Solver requires a model to operate on");
    }

    var output = "",
        ary = [],
        norm = 1,
        lookup = {
            "max": "<=",
            "min": ">=",
            "equal": "="
        },
        rxClean = new RegExp("[^A-Za-z0-9_\[\{\}\/\.\&\#\$\%\~\'\@\^]", "gi");

    // Build the objective statement
    
    if(model.opType){
        
        output += model.opType + ":";

        // Iterate over the variables
        for(var x in model.variables){
            // Give each variable a self of 1 unless
            // it exists already
            model.variables[x][x] = model.variables[x][x] ? model.variables[x][x] : 1;

            // Does our objective exist here?
            if(model.variables[x][model.optimize]){
                output += " " + model.variables[x][model.optimize] + " " + x.replace(rxClean,"_");
            }
        }
    } else {
        output += "max:";
    }
    


    // Add some closure to our line thing
    output += ";\n\n";

    // And now... to iterate over the constraints
    for(var xx in model.constraints){
        for(var y in model.constraints[xx]){
            if(typeof lookup[y] !== "undefined"){
                
                for(var z in model.variables){

                    // Does our Constraint exist here?
                    if(typeof model.variables[z][xx] !== "undefined"){
                        output += " " + model.variables[z][xx] + " " + z.replace(rxClean,"_");
                    }
                }
                // Add the constraint type and value...

                output += " " + lookup[y] + " " + model.constraints[xx][y];
                output += ";\n";
                
            }
        }
    }

    // Are there any ints?
    if(model.ints){
        output += "\n\n";
        for(var xxx in model.ints){
            output += "int " + xxx.replace(rxClean,"_") + ";\n";
        }
    }

    // Are there any unrestricted?
    if(model.unrestricted){
        output += "\n\n";
        for(var xxxx in model.unrestricted){
            output += "unrestricted " + xxxx.replace(rxClean,"_") + ";\n";
        }
    }

    // And kick the string back
    return output;

}


module.exports = function (model) {
    // If the user is giving us an array
    // or a string, convert it to a JSON Model
    // otherwise, spit it out as a string
    if(model.length){
        return to_JSON(model);
    } else {
        return from_JSON(model);
    }
};


/***/ }),

/***/ 791:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*global describe*/
/*global require*/
/*global it*/
/*global console*/
/*global process*/
/*global exports*/
/*global Promise*/
/*global module*/

module.exports = {
    "lpsolve": __webpack_require__(227)
};

/***/ }),

/***/ 824:
/***/ ((module) => {

/*global module*/

function Solution(tableau, evaluation, feasible, bounded) {
    this.feasible = feasible;
    this.evaluation = evaluation;
    this.bounded = bounded;
    this._tableau = tableau;
}
module.exports = Solution;

Solution.prototype.generateSolutionSet = function () {
    var solutionSet = {};

    var tableau = this._tableau;
    var varIndexByRow = tableau.varIndexByRow;
    var variablesPerIndex = tableau.variablesPerIndex;
    var matrix = tableau.matrix;
    var rhsColumn = tableau.rhsColumn;
    var lastRow = tableau.height - 1;
    var roundingCoeff = Math.round(1 / tableau.precision);

    for (var r = 1; r <= lastRow; r += 1) {
        var varIndex = varIndexByRow[r];
        var variable = variablesPerIndex[varIndex];
        if (variable === undefined || variable.isSlack === true) {
            continue;
        }

        var varValue = matrix[r][rhsColumn];
        solutionSet[variable.id] =
            Math.round((Number.EPSILON + varValue) * roundingCoeff) / roundingCoeff;
    }

    return solutionSet;
};


/***/ }),

/***/ 871:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*global require*/
/*global module*/
__webpack_require__(981);
__webpack_require__(314);
__webpack_require__(110);
__webpack_require__(217);
__webpack_require__(269);
__webpack_require__(38);
__webpack_require__(304);

module.exports = __webpack_require__(442);


/***/ }),

/***/ 981:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

/*global describe*/
/*global require*/
/*global module*/
/*global it*/
/*global console*/
/*global process*/

var Tableau = __webpack_require__(442);

//-------------------------------------------------------------------
// Function: solve
// Detail: Main function, linear programming solver
//-------------------------------------------------------------------
Tableau.prototype.simplex = function () {
    // Bounded until proven otherwise
    this.bounded = true;

    // Execute Phase 1 to obtain a Basic Feasible Solution (BFS)
    this.phase1();

    // Execute Phase 2
    if (this.feasible === true) {
        // Running simplex on Initial Basic Feasible Solution (BFS)
        // N.B current solution is feasible
        this.phase2();
    }

    return this;
};

//-------------------------------------------------------------------
// Description: Convert a non standard form tableau
//              to a standard form tableau by eliminating
//              all negative values in the Right Hand Side (RHS)
//              This results in a Basic Feasible Solution (BFS)
//
//-------------------------------------------------------------------
Tableau.prototype.phase1 = function () {
    var debugCheckForCycles = this.model.checkForCycles;
    var varIndexesCycle = [];

    var matrix = this.matrix;
    var rhsColumn = this.rhsColumn;
    var lastColumn = this.width - 1;
    var lastRow = this.height - 1;

    var unrestricted;
    var iterations = 0;

    while (true) {
        // ******************************************
        // ** PHASE 1 - STEP  1 : FIND PIVOT ROW **
        //
        // Selecting leaving variable (feasibility condition):
        // Basic variable with most negative value
        //
        // ******************************************
        var leavingRowIndex = 0;
        var rhsValue = -this.precision;
        for (var r = 1; r <= lastRow; r++) {
            unrestricted = this.unrestrictedVars[this.varIndexByRow[r]] === true;
            
            //
            // *Don't think this does anything...
            //
            //if (unrestricted) {
            //    continue;
            //}

            var value = matrix[r][rhsColumn];
            if (value < rhsValue) {
                rhsValue = value;
                leavingRowIndex = r;
            }
        }

        // If nothing is strictly smaller than 0; we're done with phase 1.
        if (leavingRowIndex === 0) {
            // Feasible, champagne!
            this.feasible = true;
            return iterations;
        }


        // ******************************************
        // ** PHASE 1 - STEP  2 : FIND PIVOT COLUMN **
        //
        //
        // ******************************************
        // Selecting entering variable
        var enteringColumn = 0;
        var maxQuotient = -Infinity;
        var costRow = matrix[0];
        var leavingRow = matrix[leavingRowIndex];
        for (var c = 1; c <= lastColumn; c++) {
            var coefficient = leavingRow[c];
            //
            // *Don't think this does anything...
            //
            //if (-this.precision < coefficient && coefficient < this.precision) {
            //    continue;
            //}
            //

            unrestricted = this.unrestrictedVars[this.varIndexByCol[c]] === true;
            if (unrestricted || coefficient < -this.precision) {
                var quotient = -costRow[c] / coefficient;
                if (maxQuotient < quotient) {
                    maxQuotient = quotient;
                    enteringColumn = c;
                }
            }
        }

        if (enteringColumn === 0) {
            // Not feasible
            this.feasible = false;
            return iterations;
        }

        if(debugCheckForCycles){
            varIndexesCycle.push([this.varIndexByRow[leavingRowIndex], this.varIndexByCol[enteringColumn]]);

            var cycleData = this.checkForCycles(varIndexesCycle);
            if(cycleData.length > 0){

                this.model.messages.push("Cycle in phase 1");
                this.model.messages.push("Start :"+ cycleData[0]);
                this.model.messages.push("Length :"+ cycleData[1]);

                this.feasible = false;
                return iterations;
                
            }
        }

        this.pivot(leavingRowIndex, enteringColumn);
        iterations += 1;
    }
};

//-------------------------------------------------------------------
// Description: Apply simplex to obtain optimal solution
//              used as phase2 of the simplex
//
//-------------------------------------------------------------------
Tableau.prototype.phase2 = function () {
    var debugCheckForCycles = this.model.checkForCycles;
    var varIndexesCycle = [];

    var matrix = this.matrix;
    var rhsColumn = this.rhsColumn;
    var lastColumn = this.width - 1;
    var lastRow = this.height - 1;

    var precision = this.precision;
    var nOptionalObjectives = this.optionalObjectives.length;
    var optionalCostsColumns = null;

    var iterations = 0;
    var reducedCost, unrestricted;

    while (true) {
        var costRow = matrix[this.costRowIndex];

        // Selecting entering variable (optimality condition)
        if (nOptionalObjectives > 0) {
            optionalCostsColumns = [];
        }

        var enteringColumn = 0;
        var enteringValue = precision;
        var isReducedCostNegative = false;
        for (var c = 1; c <= lastColumn; c++) {
            reducedCost = costRow[c];
            unrestricted = this.unrestrictedVars[this.varIndexByCol[c]] === true;

            if (nOptionalObjectives > 0 && -precision < reducedCost && reducedCost < precision) {
                optionalCostsColumns.push(c);
                continue;
            }

            if (unrestricted && reducedCost < 0) {
                if (-reducedCost > enteringValue) {
                    enteringValue = -reducedCost;
                    enteringColumn = c;
                    isReducedCostNegative = true;
                }
                continue;
            }

            if (reducedCost > enteringValue) {
                enteringValue = reducedCost;
                enteringColumn = c;
                isReducedCostNegative = false;
            }
        }

        if (nOptionalObjectives > 0) {
            // There exist optional improvable objectives
            var o = 0;
            while (enteringColumn === 0 && optionalCostsColumns.length > 0 && o < nOptionalObjectives) {
                var optionalCostsColumns2 = [];
                var reducedCosts = this.optionalObjectives[o].reducedCosts;

                enteringValue = precision;

                for (var i = 0; i < optionalCostsColumns.length; i++) {
                    c = optionalCostsColumns[i];

                    reducedCost = reducedCosts[c];
                    unrestricted = this.unrestrictedVars[this.varIndexByCol[c]] === true;

                    if (-precision < reducedCost && reducedCost < precision) {
                        optionalCostsColumns2.push(c);
                        continue;
                    }

                    if (unrestricted && reducedCost < 0) {
                        if (-reducedCost > enteringValue) {
                            enteringValue = -reducedCost;
                            enteringColumn = c;
                            isReducedCostNegative = true;
                        }
                        continue;
                    }

                    if (reducedCost > enteringValue) {
                        enteringValue = reducedCost;
                        enteringColumn = c;
                        isReducedCostNegative = false;
                    }
                }
                optionalCostsColumns = optionalCostsColumns2;
                o += 1;
            }
        }


        // If no entering column could be found we're done with phase 2.
        if (enteringColumn === 0) {
            this.setEvaluation();
            this.simplexIters += 1;
            return iterations;
        }

        // Selecting leaving variable
        var leavingRow = 0;
        var minQuotient = Infinity;

        var varIndexByRow = this.varIndexByRow;

        for (var r = 1; r <= lastRow; r++) {
            var row = matrix[r];
            var rhsValue = row[rhsColumn];
            var colValue = row[enteringColumn];

            if (-precision < colValue && colValue < precision) {
                continue;
            }

            if (colValue > 0 && precision > rhsValue && rhsValue > -precision) {
                minQuotient = 0;
                leavingRow = r;
                break;
            }

            var quotient = isReducedCostNegative ? -rhsValue / colValue : rhsValue / colValue;
            if (quotient > precision && minQuotient > quotient) {
                minQuotient = quotient;
                leavingRow = r;
            }
        }

        if (minQuotient === Infinity) {
            // optimal value is -Infinity
            this.evaluation = -Infinity;
            this.bounded = false;
            this.unboundedVarIndex = this.varIndexByCol[enteringColumn];
            return iterations;
        }

        if(debugCheckForCycles){
            varIndexesCycle.push([this.varIndexByRow[leavingRow], this.varIndexByCol[enteringColumn]]);

            var cycleData = this.checkForCycles(varIndexesCycle);
            if(cycleData.length > 0){

                this.model.messages.push("Cycle in phase 2");
                this.model.messages.push("Start :"+ cycleData[0]);
                this.model.messages.push("Length :"+ cycleData[1]);

                this.feasible = false;
                return iterations;
            }
        }

        this.pivot(leavingRow, enteringColumn, true);
        iterations += 1;
    }
};

// Array holding the column indexes for which the value is not null
// on the pivot row
// Shared by all tableaux for smaller overhead and lower memory usage
var nonZeroColumns = [];


//-------------------------------------------------------------------
// Description: Execute pivot operations over a 2d array,
//          on a given row, and column
//
//-------------------------------------------------------------------
Tableau.prototype.pivot = function (pivotRowIndex, pivotColumnIndex) {
    var matrix = this.matrix;

    var quotient = matrix[pivotRowIndex][pivotColumnIndex];

    var lastRow = this.height - 1;
    var lastColumn = this.width - 1;

    var leavingBasicIndex = this.varIndexByRow[pivotRowIndex];
    var enteringBasicIndex = this.varIndexByCol[pivotColumnIndex];

    this.varIndexByRow[pivotRowIndex] = enteringBasicIndex;
    this.varIndexByCol[pivotColumnIndex] = leavingBasicIndex;

    this.rowByVarIndex[enteringBasicIndex] = pivotRowIndex;
    this.rowByVarIndex[leavingBasicIndex] = -1;

    this.colByVarIndex[enteringBasicIndex] = -1;
    this.colByVarIndex[leavingBasicIndex] = pivotColumnIndex;

    // Divide everything in the target row by the element @
    // the target column
    var pivotRow = matrix[pivotRowIndex];
    var nNonZeroColumns = 0;
    for (var c = 0; c <= lastColumn; c++) {
        if (!(pivotRow[c] >= -1e-16 && pivotRow[c] <= 1e-16)) {
            pivotRow[c] /= quotient;
            nonZeroColumns[nNonZeroColumns] = c;
            nNonZeroColumns += 1;
        } else {
            pivotRow[c] = 0;
        }
    }
    pivotRow[pivotColumnIndex] = 1 / quotient;

    // for every row EXCEPT the pivot row,
    // set the value in the pivot column = 0 by
    // multiplying the value of all elements in the objective
    // row by ... yuck... just look below; better explanation later
    var coefficient, i, v0;
    var precision = this.precision;
    
    // //////////////////////////////////////
    //
    // This is step 2 of the pivot function.
    // It is, by far, the most expensive piece of
    // this whole process where the code can be optimized (faster code)
    // without changing the whole algorithm (fewer cycles)
    //
    // 1.) For every row but the pivot row
    // 2.) Update each column to 
    //    a.) itself
    //        less
    //    b.) active-row's pivot column
    //        times
    //    c.) whatever-the-hell this is: nonZeroColumns[i]
    // 
    // //////////////////////////////////////
    // console.time("step-2");
    for (var r = 0; r <= lastRow; r++) {
        if (r !== pivotRowIndex) {
            //if(1 === 1){
            if(!(matrix[r][pivotColumnIndex] >= -1e-16 && matrix[r][pivotColumnIndex] <= 1e-16)){
            //if((matrix[r][pivotColumnIndex] !== 0)){
                // Set reference to the row we're working on
                //
                var row = matrix[r];

                // Catch the coefficient that we're going to end up dividing everything by
                coefficient = row[pivotColumnIndex];
                
                // No point Burning Cycles if
                // Zero to the thing
                if (!(coefficient >= -1e-16 && coefficient <= 1e-16)) {
                    for (i = 0; i < nNonZeroColumns; i++) {
                        c = nonZeroColumns[i];
                        // No point in doing math if you're just adding
                        // Zero to the thing
                        v0 = pivotRow[c];
                        if (!(v0 >= -1e-16 && v0 <= 1e-16)) {
                            row[c] = row[c] - coefficient * v0;
                        } else {
                            if(v0 !== 0){
                                pivotRow[c] = 0;
                            }
                        }
                    }

                    row[pivotColumnIndex] = -coefficient / quotient;
                } else {
                    if(coefficient !== 0){
                        row[pivotColumnIndex] = 0;
                    }
                }
            }
        }
    }
    // console.timeEnd("step-2");

    var nOptionalObjectives = this.optionalObjectives.length;
    if (nOptionalObjectives > 0) {
        for (var o = 0; o < nOptionalObjectives; o += 1) {
            var reducedCosts = this.optionalObjectives[o].reducedCosts;
            coefficient = reducedCosts[pivotColumnIndex];
            if (coefficient !== 0) {
                for (i = 0; i < nNonZeroColumns; i++) {
                    c = nonZeroColumns[i];
                    v0 = pivotRow[c];
                    if (v0 !== 0) {
                        reducedCosts[c] = reducedCosts[c] - coefficient * v0;
                    }
                }

                reducedCosts[pivotColumnIndex] = -coefficient / quotient;
            }
        }
    }
};



Tableau.prototype.checkForCycles = function (varIndexes) {
    for (var e1 = 0; e1 < varIndexes.length - 1; e1++) {
        for (var e2 = e1 + 1; e2 < varIndexes.length; e2++) {
            var elt1 = varIndexes[e1];
            var elt2 = varIndexes[e2];
            if (elt1[0] === elt2[0] && elt1[1] === elt2[1]) {
                if (e2 - e1 > varIndexes.length - e2) {
                    break;
                }
                var cycleFound = true;
                for (var i = 1; i < e2 - e1; i++) {
                    var tmp1 = varIndexes[e1+i];
                    var tmp2 = varIndexes[e2+i];
                    if(tmp1[0] !== tmp2[0] || tmp1[1] !== tmp2[1]) {
                        cycleFound = false;
                        break;
                    }
                }
                if (cycleFound) {
                    return [e1, e2 - e1];
                }
            }
        }
    }
    return [];
};


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be in strict mode.
(() => {
"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  i: () => (/* reexport */ Parser),
  R: () => (/* binding */ algorithms)
});

;// ./src/js/ui/utils.js
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
/**
 * Utilitaires pour l'interface utilisateur
 */
var UIUtils = {
  /**
   * Affiche l'overlay de chargement avec étapes (pour l'optimisation)
   */
  showLoadingOverlay: function showLoadingOverlay() {
    var overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      this.resetLoadingSteps();
    }
  },
  /**
   * Masque l'overlay de chargement (pour l'optimisation)
   */
  hideLoadingOverlay: function hideLoadingOverlay() {
    var overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      this.resetLoadingSteps();
    }
  },
  /**
   * NOUVEAU: Affiche le simple overlay de chargement (pour l'upload)
   */
  showSimpleLoadingOverlay: function showSimpleLoadingOverlay() {
    var message = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'Traitement des fichiers en cours...';
    var overlay = document.getElementById('simple-loading-overlay');
    if (overlay) {
      var textElement = overlay.querySelector('.simple-loading-text');
      if (textElement) {
        textElement.textContent = message;
      }
      overlay.classList.remove('hidden');
    }
  },
  /**
   * NOUVEAU: Masque le simple overlay de chargement (pour l'upload)
   */
  hideSimpleLoadingOverlay: function hideSimpleLoadingOverlay() {
    var overlay = document.getElementById('simple-loading-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  },
  /**
   * Met à jour le progrès et l'étape active
   */
  updateLoadingProgress: function updateLoadingProgress(stepId) {
    var percentage = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var completed = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    // Mettre à jour le pourcentage si fourni
    if (percentage !== null) {
      var progressText = document.getElementById('progress-percentage');
      var progressFill = document.getElementById('progress-fill');
      if (progressText) {
        progressText.textContent = "".concat(Math.round(percentage), "%");
      }
      if (progressFill) {
        progressFill.style.width = "".concat(percentage, "%");
      }
    }

    // Mettre à jour l'étape active
    if (stepId) {
      // Réinitialiser toutes les étapes
      document.querySelectorAll('.loading-step').forEach(function (step) {
        step.classList.remove('active');
      });

      // Marquer les étapes précédentes comme complétées
      var currentStep = document.getElementById(stepId);
      if (currentStep) {
        var steps = document.querySelectorAll('.loading-step');
        var currentIndex = Array.from(steps).indexOf(currentStep);
        steps.forEach(function (step, index) {
          if (index < currentIndex) {
            step.classList.add('completed');
            step.classList.remove('active');
          } else if (index === currentIndex) {
            step.classList.add('active');
            step.classList.remove('completed');
            if (completed) {
              step.classList.add('completed');
              step.classList.remove('active');
            }
          } else {
            step.classList.remove('active', 'completed');
          }
        });
      }
    }
  },
  /**
   * Remet à zéro les étapes de chargement
   */
  resetLoadingSteps: function resetLoadingSteps() {
    document.querySelectorAll('.loading-step').forEach(function (step) {
      step.classList.remove('active', 'completed');
    });
    var progressText = document.getElementById('progress-percentage');
    var progressFill = document.getElementById('progress-fill');
    if (progressText) {
      progressText.textContent = '0%';
    }
    if (progressFill) {
      progressFill.style.width = '0%';
    }
  },
  /**
   * Télécharge un fichier
   */
  downloadFile: function downloadFile(content, filename, type) {
    var blob = content instanceof Blob ? content : new Blob([content], {
      type: type
    });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  /**
   * Affiche le texte de l'étape courante dans le loading overlay (mode dynamique)
   * @param {string} stepText - Texte à afficher (ex: "ILP pour le modèle 2/3")
   */
  setLoadingStepText: function setLoadingStepText(stepText) {
    var subtitle = document.querySelector('#loading-overlay .loading-subtitle');
    if (subtitle) {
      subtitle.textContent = stepText;
    }
  },
  /**
   * Cache la barre de progression et les étapes (mode dynamique)
   */
  hideLoadingProgressBar: function hideLoadingProgressBar() {
    var progress = document.querySelector('#loading-overlay .loading-progress');
    var steps = document.querySelector('#loading-overlay .loading-steps');
    if (progress) progress.style.display = 'none';
    if (steps) steps.style.display = 'none';
  },
  /**
   * Réaffiche la barre de progression et les étapes (pour la fin ou le reset)
   */
  showLoadingProgressBar: function showLoadingProgressBar() {
    var progress = document.querySelector('#loading-overlay .loading-progress');
    var steps = document.querySelector('#loading-overlay .loading-steps');
    if (progress) progress.style.display = '';
    if (steps) steps.style.display = '';
  },
  /**
   * Transforme "debout" en "Debout" et "a-plat" en "À plat"
   */
  formatOrientation: function formatOrientation(orientation) {
    if (!orientation) return '';
    var formatted = orientation.replace('a-plat', 'À plat').replace('debout', 'Debout');
    return formatted;
  },
  /**
   * Formate les longueurs en mm pour qu'il y ait des espaces tous les 3 chiffres (en partant de la droite)
   */
  formatLenght: function formatLenght(lengthInMm) {
    if (!lengthInMm && lengthInMm !== 0) return '';
    var lengthString = lengthInMm.toString();
    var formatedLengthString = "";

    // Parcourir la chaîne de droite à gauche pour ajouter des espaces tous les 3 chiffres
    for (var i = lengthString.length - 1; i >= 0; i--) {
      formatedLengthString = lengthString[i] + formatedLengthString;

      // Ajouter un espace tous les 3 chiffres (mais pas au début)
      var positionFromRight = lengthString.length - i;
      if (positionFromRight % 3 === 0 && i > 0) {
        formatedLengthString = " " + formatedLengthString;
      }
    }
    return formatedLengthString;
  },
  /**
   * Nettoie les espaces d'un objet de données de formulaire
   * @param {Object} data - Objet contenant les données du formulaire
   * @returns {Object} - Objet avec les valeurs nettoyées
   */
  trimFormData: function trimFormData(data) {
    var trimmedData = {};
    for (var _i = 0, _Object$entries = Object.entries(data); _i < _Object$entries.length; _i++) {
      var _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2),
        key = _Object$entries$_i[0],
        value = _Object$entries$_i[1];
      if (typeof value === 'string') {
        trimmedData[key] = value.trim();
      } else {
        trimmedData[key] = value;
      }
    }
    return trimmedData;
  }
};
;// ./src/js/data-manager.js
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function data_manager_slicedToArray(r, e) { return data_manager_arrayWithHoles(r) || data_manager_iterableToArrayLimit(r, e) || data_manager_unsupportedIterableToArray(r, e) || data_manager_nonIterableRest(); }
function data_manager_nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function data_manager_iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function data_manager_arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || data_manager_unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return data_manager_arrayLikeToArray(r); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = data_manager_unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function data_manager_unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return data_manager_arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? data_manager_arrayLikeToArray(r, a) : void 0; } }
function data_manager_arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
/**
 * DataManager - Service pur de gestion des données (SANS ID)
 */
var DataManager = {
  // Structure de données simplifiée
  data: {
    pieces: {},
    // Barres filles groupées par profil
    motherBars: {} // Barres mères groupées par profil
  },
  // Clé pour le localStorage
  STORAGE_KEY: 'cms-mother-bars-stock',
  /**
   * Initialise les données
   */
  initData: function initData() {
    this.data = {
      pieces: {},
      motherBars: {}
    };

    // NOUVEAU: Charger automatiquement les barres mères sauvegardées
    this.loadMotherBarsFromStorage();
    return this.data;
  },
  /**
   * Récupère l'état des données
   */
  getData: function getData() {
    return this.data;
  },
  /**
   * Génère une clé unique pour une barre fille basée sur ses propriétés
   */
  generatePieceKey: function generatePieceKey(piece) {
    var _piece$angles, _piece$angles2;
    var profile = piece.profile || 'UNKNOWN';
    var length = piece.length || 0;
    var orientation = piece.orientation || 'a-plat';
    var angle1 = ((_piece$angles = piece.angles) === null || _piece$angles === void 0 ? void 0 : _piece$angles[1]) || 90;
    var angle2 = ((_piece$angles2 = piece.angles) === null || _piece$angles2 === void 0 ? void 0 : _piece$angles2[2]) || 90;
    var nom = piece.nom || '';

    // Utiliser nom si disponible, sinon profil+longueur
    var nameKey = nom.trim() !== '' ? nom : "".concat(profile, "_").concat(length, "mm");
    return "".concat(profile, "|").concat(orientation, "|").concat(length, "|").concat(angle1, "|").concat(angle2, "|").concat(nameKey);
  },
  /**
   * Génère une clé unique pour une barre mère basée sur ses propriétés
   */
  generateMotherBarKey: function generateMotherBarKey(bar) {
    var profile = bar.profile || 'UNKNOWN';
    var length = bar.length || 0;
    return "".concat(profile, "|").concat(length);
  },
  /**
   * Ajoute une liste de barres aux données
   */
  addBars: function addBars(bars) {
    var _this = this;
    if (!Array.isArray(bars) || bars.length === 0) return [];
    var addedKeys = [];
    bars.forEach(function (bar) {
      if (!bar) return; // Ignorer les barres nulles

      // Ajouter à la structure appropriée selon le type
      if (bar.type === 'fille') {
        var key = _this._addToPieces(bar);
        if (key) addedKeys.push(key);
      } else if (bar.type === 'mere' || bar.type === 'mother') {
        var _key = _this._addToMotherBars(bar);
        if (_key) addedKeys.push(_key);
      }
    });
    return addedKeys;
  },
  /**
   * Trie les barres dans une collection selon l'ordre : profil → orientation → longueur
   */
  _sortBarsCollection: function _sortBarsCollection(bars) {
    return bars.sort(function (a, b) {
      // 1. Trier par profil
      if (a.profile !== b.profile) {
        return a.profile.localeCompare(b.profile);
      }

      // 2. Trier par orientation (pour les pièces uniquement)
      if (a.orientation && b.orientation && a.orientation !== b.orientation) {
        var orientationOrder = {
          'a-plat': 0,
          'debout': 1
        };
        var orderA = orientationOrder[a.orientation] !== undefined ? orientationOrder[a.orientation] : 2;
        var orderB = orientationOrder[b.orientation] !== undefined ? orientationOrder[b.orientation] : 2;
        return orderA - orderB;
      }

      // 3. Trier par longueur
      return a.length - b.length;
    });
  },
  /**
   * Ajoute une barre fille à la structure pieces avec tri automatique
   */
  _addToPieces: function _addToPieces(bar) {
    var _this2 = this;
    var profile = bar.profile;
    var key = this.generatePieceKey(bar);

    // Créer l'entrée pour ce profil si nécessaire
    if (!this.data.pieces[profile]) {
      this.data.pieces[profile] = [];
    }

    // Vérifier si une barre identique existe déjà
    var existingIndex = this.data.pieces[profile].findIndex(function (b) {
      return _this2.generatePieceKey(b) === key;
    });
    if (existingIndex !== -1) {
      // Mettre à jour la quantité de la barre existante
      this.data.pieces[profile][existingIndex].quantity += bar.quantity || 1;
    } else {
      // Ajouter la nouvelle barre avec tous les champs nécessaires
      var newPiece = _objectSpread(_objectSpread({}, bar), {}, {
        orientation: bar.orientation || 'a-plat',
        angles: bar.angles || {
          1: 90,
          2: 90
        },
        f4cData: bar.f4cData || {}
      });
      this.data.pieces[profile].push(newPiece);
    }

    // Trier automatiquement après ajout
    this._sortBarsCollection(this.data.pieces[profile]);
    return key;
  },
  /**
   * Ajoute une barre mère à la structure motherBars avec tri automatique
   */
  _addToMotherBars: function _addToMotherBars(bar) {
    var _this3 = this;
    var profile = bar.profile;
    var key = this.generateMotherBarKey(bar);

    // Créer l'entrée pour ce profil si nécessaire
    if (!this.data.motherBars[profile]) {
      this.data.motherBars[profile] = [];
    }

    // Vérifier si une barre identique existe déjà
    var existingIndex = this.data.motherBars[profile].findIndex(function (b) {
      return _this3.generateMotherBarKey(b) === key;
    });
    if (existingIndex !== -1) {
      // Mettre à jour la quantité de la barre existante
      this.data.motherBars[profile][existingIndex].quantity += bar.quantity || 1;
    } else {
      // Ajouter la nouvelle barre (sans nom pour les barres mères)
      var motherBar = {
        profile: bar.profile,
        length: bar.length,
        quantity: bar.quantity || 1,
        type: bar.type || 'mere'
      };
      this.data.motherBars[profile].push(motherBar);
    }

    // Trier automatiquement après ajout
    this._sortBarsCollection(this.data.motherBars[profile]);

    // NOUVEAU: Sauvegarder automatiquement après modification
    this.saveMotherBarsToStorage();
    return key;
  },
  /**
   * Supprime une pièce par sa clé
   */
  deletePiece: function deletePiece(key) {
    var _this4 = this;
    for (var profile in this.data.pieces) {
      var pieceIndex = this.data.pieces[profile].findIndex(function (p) {
        return _this4.generatePieceKey(p) === key;
      });
      if (pieceIndex !== -1) {
        this.data.pieces[profile].splice(pieceIndex, 1);

        // Nettoyer la structure si vide
        if (this.data.pieces[profile].length === 0) {
          delete this.data.pieces[profile];
        }
        return true;
      }
    }
    return false;
  },
  /**
   * Supprime une barre mère par sa clé
   */
  deleteMotherBar: function deleteMotherBar(key) {
    var _this5 = this;
    for (var profile in this.data.motherBars) {
      var barIndex = this.data.motherBars[profile].findIndex(function (b) {
        return _this5.generateMotherBarKey(b) === key;
      });
      if (barIndex !== -1) {
        this.data.motherBars[profile].splice(barIndex, 1);

        // Nettoyer la structure si vide
        if (this.data.motherBars[profile].length === 0) {
          delete this.data.motherBars[profile];
        }

        // Sauvegarder les barres mères restantes dans le localStorage
        this.saveMotherBarsToStorage();
        return true;
      }
    }
    return false;
  },
  /**
   * Met à jour une pièce par sa clé
   */
  updatePiece: function updatePiece(key, updatedValues) {
    var _this6 = this;
    // Trouver la pièce par sa clé
    for (var profile in this.data.pieces) {
      var pieceIndex = this.data.pieces[profile].findIndex(function (p) {
        return _this6.generatePieceKey(p) === key;
      });
      if (pieceIndex !== -1) {
        var oldPiece = this.data.pieces[profile][pieceIndex];
        var oldProfile = oldPiece.profile;
        var newProfile = updatedValues.profile || oldProfile;

        // Suppression de l'ancienne pièce
        this.data.pieces[oldProfile].splice(pieceIndex, 1);

        // Re-trier après suppression
        if (this.data.pieces[oldProfile].length > 0) {
          this._sortBarsCollection(this.data.pieces[oldProfile]);
        } else {
          delete this.data.pieces[oldProfile];
        }

        // Créer la pièce mise à jour
        var updatedPiece = _objectSpread(_objectSpread({}, oldPiece), updatedValues);

        // Ajouter la pièce mise à jour
        if (!this.data.pieces[newProfile]) {
          this.data.pieces[newProfile] = [];
        }
        this.data.pieces[newProfile].push(updatedPiece);

        // Trier automatiquement après ajout
        this._sortBarsCollection(this.data.pieces[newProfile]);
        return this.generatePieceKey(updatedPiece);
      }
    }
    return null;
  },
  /**
   * Met à jour une barre mère par sa clé
   */
  updateMotherBar: function updateMotherBar(key, updatedValues) {
    var _this7 = this;
    // Trouver la barre par sa clé
    for (var profile in this.data.motherBars) {
      var barIndex = this.data.motherBars[profile].findIndex(function (b) {
        return _this7.generateMotherBarKey(b) === key;
      });
      if (barIndex !== -1) {
        var oldBar = this.data.motherBars[profile][barIndex];
        var oldProfile = oldBar.profile;
        var newProfile = updatedValues.profile || oldProfile;

        // Suppression de l'ancienne barre
        this.data.motherBars[oldProfile].splice(barIndex, 1);

        // Re-trier après suppression
        if (this.data.motherBars[oldProfile].length > 0) {
          this._sortBarsCollection(this.data.motherBars[oldProfile]);
        } else {
          delete this.data.motherBars[oldProfile];
        }

        // Créer la barre mise à jour
        var updatedBar = _objectSpread(_objectSpread({}, oldBar), updatedValues);
        delete updatedBar.nom; // Supprimer la propriété nom des barres mères

        // Ajouter la barre mise à jour
        if (!this.data.motherBars[newProfile]) {
          this.data.motherBars[newProfile] = [];
        }
        this.data.motherBars[newProfile].push(updatedBar);

        // Trier automatiquement après ajout
        this._sortBarsCollection(this.data.motherBars[newProfile]);

        // NOUVEAU: Sauvegarder automatiquement après modification
        this.saveMotherBarsToStorage();
        return this.generateMotherBarKey(updatedBar);
      }
    }
    return null;
  },
  /**
   * Récupère une pièce par sa clé
   */
  getPieceByKey: function getPieceByKey(key) {
    for (var profile in this.data.pieces) {
      var _iterator = _createForOfIteratorHelper(this.data.pieces[profile]),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var piece = _step.value;
          if (this.generatePieceKey(piece) === key) {
            return _objectSpread({}, piece); // Retourner une copie
          }
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    }
    return null;
  },
  /**
   * Récupère une barre mère par sa clé
   */
  getMotherBarByKey: function getMotherBarByKey(key) {
    for (var profile in this.data.motherBars) {
      var _iterator2 = _createForOfIteratorHelper(this.data.motherBars[profile]),
        _step2;
      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var bar = _step2.value;
          if (this.generateMotherBarKey(bar) === key) {
            return _objectSpread({}, bar); // Retourner une copie
          }
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }
    }
    return null;
  },
  /**
   * NOUVEAU: Obtient les capacités des barres mères par profil
   * @returns {Object} Structure {profile: [{length: X, quantity: Y}, ...]}
   */
  getMotherBarCapabilities: function getMotherBarCapabilities() {
    var capabilities = {};
    for (var profile in this.data.motherBars) {
      capabilities[profile] = this.data.motherBars[profile].map(function (bar) {
        return {
          length: bar.length,
          quantity: bar.quantity
        };
      });
    }
    return capabilities;
  },
  /**
   * NOUVEAU: Vérifie si une pièce peut être découpée avec les barres mères disponibles
   * @param {Object} piece - Pièce à vérifier {profile, length, quantity}
   * @returns {Object} {compatible: boolean, reason: string, suggestions: []}
   */
  checkPieceCompatibility: function checkPieceCompatibility(piece) {
    var motherBarsForProfile = this.data.motherBars[piece.profile];
    if (!motherBarsForProfile || motherBarsForProfile.length === 0) {
      return {
        compatible: false,
        reason: 'profil_manquant',
        message: "Aucune barre m\xE8re disponible pour le profil ".concat(piece.profile),
        suggestions: ["Ajoutez des barres m\xE8res de profil ".concat(piece.profile)]
      };
    }
    var compatibleBars = motherBarsForProfile.filter(function (bar) {
      return bar.length >= piece.length;
    });
    if (compatibleBars.length === 0) {
      var maxLength = Math.max.apply(Math, _toConsumableArray(motherBarsForProfile.map(function (bar) {
        return bar.length;
      })));
      return {
        compatible: false,
        reason: 'longueur_insuffisante',
        message: "Aucune barre m\xE8re de ".concat(piece.profile, " assez longue (max: ").concat(maxLength, "mm, besoin: ").concat(piece.length, "mm)"),
        maxAvailableLength: maxLength,
        deficit: piece.length - maxLength,
        suggestions: ["Ajoutez des barres m\xE8res de ".concat(piece.profile, " d'au moins ").concat(piece.length, "mm"), "R\xE9duisez la longueur de la pi\xE8ce \xE0 maximum ".concat(maxLength, "mm")]
      };
    }
    return {
      compatible: true,
      reason: 'compatible',
      message: "".concat(compatibleBars.length, " barre(s) m\xE8re(s) compatible(s) trouv\xE9e(s)"),
      compatibleBars: compatibleBars.length
    };
  },
  /**
   * Valide les données avant optimisation - VERSION AMÉLIORÉE
   */
  validateData: function validateData() {
    var data = this.getData();

    // Vérifier qu'il y a des pièces à découper
    var totalPieces = 0;
    var allPieces = [];
    for (var profile in data.pieces) {
      var _iterator3 = _createForOfIteratorHelper(data.pieces[profile]),
        _step3;
      try {
        for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
          var piece = _step3.value;
          if (!piece.length || piece.length <= 0) {
            return {
              valid: false,
              message: "La pi\xE8ce \"".concat(piece.nom || piece.profile, "\" a une longueur invalide.")
            };
          }
          if (!piece.quantity || piece.quantity <= 0) {
            return {
              valid: false,
              message: "La pi\xE8ce \"".concat(piece.nom || piece.profile, "\" a une quantit\xE9 invalide.")
            };
          }
          totalPieces += piece.quantity;
          allPieces.push(piece);
        }
      } catch (err) {
        _iterator3.e(err);
      } finally {
        _iterator3.f();
      }
    }
    if (totalPieces === 0) {
      return {
        valid: false,
        message: 'Aucune pièce à découper. Importez des fichiers NC2 ou ajoutez des pièces manuellement.'
      };
    }

    // Vérifier qu'il y a des barres mères
    var totalMotherBars = 0;
    for (var _profile in data.motherBars) {
      var _iterator4 = _createForOfIteratorHelper(data.motherBars[_profile]),
        _step4;
      try {
        for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
          var bar = _step4.value;
          if (!bar.length || bar.length <= 0) {
            return {
              valid: false,
              message: "La barre m\xE8re \"".concat(bar.profile, "\" a une longueur invalide.")
            };
          }
          if (!bar.quantity || bar.quantity <= 0) {
            return {
              valid: false,
              message: "La barre m\xE8re \"".concat(bar.profile, "\" a une quantit\xE9 invalide.")
            };
          }
          totalMotherBars += bar.quantity;
        }
      } catch (err) {
        _iterator4.e(err);
      } finally {
        _iterator4.f();
      }
    }
    if (totalMotherBars === 0) {
      return {
        valid: false,
        message: 'Aucune barre mère disponible. Ajoutez des barres mères pour l\'optimisation.'
      };
    }

    // NOUVEAU: Validation de compatibilité
    var incompatibilities = [];
    for (var _i = 0, _allPieces = allPieces; _i < _allPieces.length; _i++) {
      var _piece = _allPieces[_i];
      var compatibility = this.checkPieceCompatibility(_piece);
      if (!compatibility.compatible) {
        incompatibilities.push(_objectSpread({
          piece: _piece.nom || "".concat(_piece.profile, "_").concat(_piece.length, "mm")
        }, compatibility));
      }
    }
    if (incompatibilities.length > 0) {
      var firstIncompatibility = incompatibilities[0];
      var message = "Incompatibilit\xE9 d\xE9tect\xE9e: ".concat(firstIncompatibility.message);
      if (incompatibilities.length > 1) {
        message += " (et ".concat(incompatibilities.length - 1, " autre(s) probl\xE8me(s))");
      }
      return {
        valid: false,
        message: message,
        incompatibilities: incompatibilities
      };
    }
    return {
      valid: true
    };
  },
  /**
   * Récupère toutes les barres filles d'un profil et orientation donnés
   */
  getPiecesByModel: function getPiecesByModel(profile, orientation) {
    if (!profile || !orientation) return [];

    // Vérifier si le profil existe dans la structure pieces
    if (!this.data.pieces[profile]) return [];

    // Filtrer les pièces par orientation
    return this.data.pieces[profile].filter(function (piece) {
      return piece.orientation === orientation;
    });
  },
  /**
   * Récupère toutes les longueurs et quantités des barres mères d'un profil donné
   */
  getMotherBarsByProfile: function getMotherBarsByProfile(profile) {
    if (!profile || !this.data.motherBars[profile]) return [];
    return this.data.motherBars[profile].map(function (bar) {
      return {
        length: bar.length,
        quantity: bar.quantity
      };
    });
  },
  /**
   * Récupère toutes les longueurs et quantités des barres filles d'un modèle donné
   */
  getLengthsToCutByModel: function getLengthsToCutByModel(profile, orientation) {
    var filteredPieces = this.getPiecesByModel(profile, orientation);
    // Regrouper toutes les longeurs identique pour jouer sur la quantité
    var lengthMap = new Map();
    var _iterator5 = _createForOfIteratorHelper(filteredPieces),
      _step5;
    try {
      for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
        var piece = _step5.value;
        var existing = lengthMap.get(piece.length);
        if (existing) {
          existing.quantity += piece.quantity;
        } else {
          lengthMap.set(piece.length, {
            length: piece.length,
            quantity: piece.quantity
          });
        }
      }
    } catch (err) {
      _iterator5.e(err);
    } finally {
      _iterator5.f();
    }
    return Array.from(lengthMap.values());
  },
  /**
   * Récupère tous les modèles distincts de barres à découper
   */
  getModels: function getModels() {
    var models = new Set();

    // Parcourir toutes les pièces pour extraire les modèles uniques
    for (var profile in this.data.pieces) {
      var _iterator6 = _createForOfIteratorHelper(this.data.pieces[profile]),
        _step6;
      try {
        for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
          var piece = _step6.value;
          var orientation = piece.orientation || 'a-plat';
          var modelKey = "".concat(profile, "_").concat(orientation);
          models.add(modelKey);
        }
      } catch (err) {
        _iterator6.e(err);
      } finally {
        _iterator6.f();
      }
    }

    // Convertir en tableau d'objets avec tri
    var modelArray = Array.from(models).map(function (modelKey) {
      var _modelKey$split = modelKey.split('_'),
        _modelKey$split2 = data_manager_slicedToArray(_modelKey$split, 2),
        profile = _modelKey$split2[0],
        orientation = _modelKey$split2[1];
      return {
        profile: profile,
        orientation: orientation
      };
    });

    // Trier par profil puis par orientation
    return modelArray.sort(function (a, b) {
      // 1. Trier par profil
      if (a.profile !== b.profile) {
        return a.profile.localeCompare(b.profile);
      }

      // 2. Trier par orientation
      var orientationOrder = {
        'a-plat': 0,
        'debout': 1
      };
      var orderA = orientationOrder[a.orientation] !== undefined ? orientationOrder[a.orientation] : 2;
      var orderB = orientationOrder[b.orientation] !== undefined ? orientationOrder[b.orientation] : 2;
      return orderA - orderB;
    });
  },
  /**
   * Efface toutes les données
   */
  clearAllData: function clearAllData() {
    this.data = {
      pieces: {},
      motherBars: {}
    };

    // NOUVEAU: Nettoyer aussi le localStorage
    this.clearStoredMotherBars();
    console.log('📝 Toutes les données ont été effacées');
    return this.data;
  },
  /**
   * NOUVEAU: Sauvegarde les barres mères dans le localStorage
   */
  saveMotherBarsToStorage: function saveMotherBarsToStorage() {
    try {
      // Nettoyer les données avant la sérialisation pour éviter les propriétés undefined
      var cleanMotherBars = this.cleanMotherBarsForStorage();
      var motherBarsData = JSON.stringify(cleanMotherBars);

      // Vérifier la taille des données (limite à 1MB)
      var sizeInBytes = new Blob([motherBarsData]).size;
      if (sizeInBytes > 1024 * 1024) {
        // 1MB
        console.warn('⚠️ Les données du stock sont trop volumineuses pour être sauvegardées');
        return;
      }
      localStorage.setItem(this.STORAGE_KEY, motherBarsData);
      console.log("\uD83D\uDCE6 Stock de barres m\xE8res sauvegard\xE9 (".concat((sizeInBytes / 1024).toFixed(1), " KB)"));
    } catch (error) {
      console.warn('⚠️ Impossible de sauvegarder le stock:', error);
      // Si l'erreur est due à un quota dépassé, essayer de nettoyer
      if (error.name === 'QuotaExceededError') {
        console.warn('🚫 Quota localStorage dépassé, suppression de l\'ancien stock');
        this.clearStoredMotherBars();
      }
    }
  },
  /**
   * NOUVEAU: Nettoie les données des barres mères pour la sauvegarde
   */
  cleanMotherBarsForStorage: function cleanMotherBarsForStorage() {
    var cleanBars = {};
    for (var profile in this.data.motherBars) {
      if (this.data.motherBars[profile] && Array.isArray(this.data.motherBars[profile])) {
        cleanBars[profile] = this.data.motherBars[profile].map(function (bar) {
          // Ne garder que les propriétés essentielles et définies
          var cleanBar = {};
          if (bar.profile !== undefined) cleanBar.profile = bar.profile;
          if (bar.length !== undefined) cleanBar.length = bar.length;
          if (bar.quantity !== undefined) cleanBar.quantity = bar.quantity;
          if (bar.type !== undefined) cleanBar.type = bar.type;
          if (bar.orientation !== undefined) cleanBar.orientation = bar.orientation;
          return cleanBar;
        }).filter(function (bar) {
          return bar.profile && bar.length && bar.quantity;
        }); // Filtrer les barres invalides
      }
    }
    return cleanBars;
  },
  /**
   * NOUVEAU: Charge les barres mères depuis le localStorage
   */
  loadMotherBarsFromStorage: function loadMotherBarsFromStorage() {
    try {
      var savedData = localStorage.getItem(this.STORAGE_KEY);
      console.log('🔍 Données sauvegardées trouvées:', savedData ? 'Oui' : 'Non');
      if (savedData) {
        var motherBars = JSON.parse(savedData);
        console.log('📋 Données parsées:', motherBars);

        // Valider que les données sont dans le bon format
        if (_typeof(motherBars) === 'object' && motherBars !== null) {
          // Valider et nettoyer chaque profil et barre
          var validatedBars = {};
          var totalBars = 0;
          for (var profile in motherBars) {
            console.log("\uD83D\uDD0D Traitement du profil: ".concat(profile), motherBars[profile]);
            if (Array.isArray(motherBars[profile])) {
              var validBars = motherBars[profile].filter(function (bar) {
                var isValid = bar && typeof bar.profile === 'string' && typeof bar.length === 'number' && bar.length > 0 && typeof bar.quantity === 'number' && bar.quantity > 0;
                console.log("\uD83D\uDD0D Validation barre:", bar, 'Valide:', isValid);
                return isValid;
              }).map(function (bar) {
                // Normaliser le type pour être compatible
                return _objectSpread(_objectSpread({}, bar), {}, {
                  type: bar.type === 'mother' ? 'mere' : bar.type || 'mere'
                });
              });
              if (validBars.length > 0) {
                validatedBars[profile] = validBars;
                totalBars += validBars.length;
                console.log("\u2705 ".concat(validBars.length, " barre(s) valid\xE9e(s) pour ").concat(profile));
              }
            }
          }
          if (totalBars > 0) {
            this.data.motherBars = validatedBars;
            console.log("\uD83D\uDCE6 ".concat(totalBars, " barre").concat(totalBars > 1 ? 's' : '', " m\xE8re").concat(totalBars > 1 ? 's' : '', " restaur\xE9e").concat(totalBars > 1 ? 's' : '', " depuis le localStorage"));
            console.log('📋 Données finales chargées:', this.data.motherBars);
            return true;
          } else {
            console.log('⚠️ Aucune barre valide trouvée après validation');
          }
        } else {
          console.log('⚠️ Format de données invalide');
        }
      }
    } catch (error) {
      console.warn('⚠️ Impossible de charger le stock sauvegardé:', error);
      // En cas d'erreur, nettoyer le localStorage corrompu
      this.clearStoredMotherBars();
    }
    return false;
  },
  /**
   * NOUVEAU: Efface le stock sauvegardé du localStorage
   */
  clearStoredMotherBars: function clearStoredMotherBars() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🗑️ Stock sauvegardé supprimé du localStorage');
    } catch (error) {
      console.warn('⚠️ Impossible de supprimer le stock sauvegardé:', error);
    }
  }
};
;// ./src/js/ui/edit-validation.js
/**
 * Validation et utilitaires pour l'édition
 */
var EditValidation = {
  /**
   * Convertit une valeur en millimètres
   */
  parseLengthFromDisplay: function parseLengthFromDisplay(displayValue) {
    if (!displayValue || displayValue.trim() === '') return null;
    var cleanValue = displayValue.replace(/\s/g, '');
    var normalizedValue = cleanValue.replace(',', '.');
    var milimeters = parseFloat(normalizedValue);
    if (isNaN(milimeters) || milimeters <= 0) return null;
    return Math.round(milimeters);
  },
  /**
   * Valide les données d'une barre fille
   */
  validatePieceData: function validatePieceData(data) {
    var errors = [];
    if (data.nom && data.nom.length > 50) {
      errors.push('Nom trop long (max 50 caractères)');
    }
    if (!data.profile || data.profile.trim() === '') {
      errors.push('Profil obligatoire');
    } else if (data.profile.length > 20) {
      errors.push('Profil trop long (max 20 caractères)');
    }
    if (!data.length || isNaN(data.length) || data.length <= 0) {
      errors.push('Longueur invalide');
    } else if (data.length > 100000) {
      errors.push('Longueur trop grande (max 100 m)');
    } else if (data.length < 100) {
      errors.push('Longueur minimale 10 cm');
    }
    if (!data.quantity || isNaN(data.quantity) || data.quantity <= 0) {
      errors.push('Quantité invalide');
    } else if (!Number.isInteger(data.quantity)) {
      errors.push('Quantité doit être un entier');
    } else if (data.quantity > 10000) {
      errors.push('Quantité trop élevée (max 10 000)');
    }
    if (data.angles) {
      if (isNaN(data.angles[1]) || data.angles[1] < -360 || data.angles[1] > 360) {
        errors.push('Angle 1 invalide (-360 à 360°)');
      }
      if (isNaN(data.angles[2]) || data.angles[2] < -360 || data.angles[2] > 360) {
        errors.push('Angle 2 invalide (-360 à 360°)');
      }
    }
    if (data.orientation && !['a-plat', 'debout'].includes(data.orientation)) {
      errors.push('Orientation invalide');
    }
    return errors;
  },
  /**
   * Valide les données d'une barre mère
   */
  validateMotherBarData: function validateMotherBarData(data) {
    var errors = [];
    if (!data.profile || data.profile.trim() === '') {
      errors.push('Profil obligatoire');
    } else if (data.profile.length > 20) {
      errors.push('Profil trop long (max 20 caractères)');
    }
    if (!data.length || isNaN(data.length) || data.length <= 0) {
      errors.push('Longueur invalide');
    } else if (data.length > 100000) {
      errors.push('Longueur trop grande (max 100 m)');
    } else if (data.length < 100) {
      errors.push('Longueur minimale 10 cm');
    }
    if (!data.quantity || isNaN(data.quantity) || data.quantity <= 0) {
      errors.push('Quantité invalide');
    } else if (!Number.isInteger(data.quantity)) {
      errors.push('Quantité doit être un entier');
    } else if (data.quantity > 1000000) {
      errors.push('Quantité trop élevée (max 1 000 000)');
    }
    return errors;
  }
};
;// ./src/js/ui/edit-panels.js
function edit_panels_createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = edit_panels_unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function edit_panels_toConsumableArray(r) { return edit_panels_arrayWithoutHoles(r) || edit_panels_iterableToArray(r) || edit_panels_unsupportedIterableToArray(r) || edit_panels_nonIterableSpread(); }
function edit_panels_nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function edit_panels_unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return edit_panels_arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? edit_panels_arrayLikeToArray(r, a) : void 0; } }
function edit_panels_iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function edit_panels_arrayWithoutHoles(r) { if (Array.isArray(r)) return edit_panels_arrayLikeToArray(r); }
function edit_panels_arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }



/**
 * Gestionnaire des panneaux d'édition
 */
var EditPanels = {
  controller: null,
  /**
   * Initialise le gestionnaire de panneaux
   */
  init: function init(controller) {
    this.controller = controller;
    this.createPiecePanel();
    this.createStockPanel();
  },
  /**
   * Convertit le code d'orientation en affichage lisible
   */
  formatOrientation: function formatOrientation(orientation) {
    switch (orientation) {
      case 'debout':
        return 'Debout';
      case 'a-plat':
        return 'À plat';
      default:
        return orientation;
    }
  },
  /**
   * Trie les barres selon l'ordre : profil → orientation → longueur
   */
  sortBars: function sortBars(bars) {
    return bars.sort(function (a, b) {
      if (a.profile !== b.profile) {
        return a.profile.localeCompare(b.profile);
      }
      if (a.orientation && b.orientation && a.orientation !== b.orientation) {
        var orientationOrder = {
          'a-plat': 0,
          'debout': 1
        };
        var orderA = orientationOrder[a.orientation] !== undefined ? orientationOrder[a.orientation] : 2;
        var orderB = orientationOrder[b.orientation] !== undefined ? orientationOrder[b.orientation] : 2;
        return orderA - orderB;
      }
      return a.length - b.length;
    });
  },
  /**
   * Rend le tableau des barres filles avec tri automatique
   */
  renderPiecesTable: function renderPiecesTable() {
    var _this = this;
    var tableContainer = document.querySelector('#pieces-table');
    var data = this.controller.dataManager.getData();
    var allPieces = [];
    for (var profile in data.pieces) {
      allPieces.push.apply(allPieces, edit_panels_toConsumableArray(data.pieces[profile]));
    }
    var sortedPieces = this.sortBars(allPieces);
    var html = "\n      <table class=\"data-table\">\n        <thead>\n          <tr>\n            <th>Nom</th>\n            <th>Profil</th>\n            <th>Orientation</th>\n            <th>Longueur</th>\n            <th>Angle 1</th>\n            <th>Angle 2</th>\n            <th>Quantit\xE9</th>\n            <th>Actions</th>\n          </tr>\n        </thead>\n        <tbody>\n    ";
    var _iterator = edit_panels_createForOfIteratorHelper(sortedPieces),
      _step;
    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var _piece$angles, _piece$angles2;
        var piece = _step.value;
        var pieceKey = this.controller.dataManager.generatePieceKey(piece);
        html += "\n        <tr data-key=\"".concat(pieceKey, "\">\n          <td>").concat(piece.nom || '-', "</td>\n          <td>").concat(piece.profile, "</td>\n          <td>").concat(this.formatOrientation(piece.orientation || "non-définie"), "</td>\n          <td>").concat(UIUtils.formatLenght(piece.length), " mm</td>\n          <td>").concat(parseFloat(((_piece$angles = piece.angles) === null || _piece$angles === void 0 ? void 0 : _piece$angles[1]) || 90).toFixed(2), "\xB0</td>\n          <td>").concat(parseFloat(((_piece$angles2 = piece.angles) === null || _piece$angles2 === void 0 ? void 0 : _piece$angles2[2]) || 90).toFixed(2), "\xB0</td>\n          <td>").concat(piece.quantity, "</td>\n          <td>\n            <div class=\"action-buttons\">\n              <button class=\"btn-action btn-action-edit edit-piece-btn\" \n                      data-key=\"").concat(pieceKey, "\" \n                      title=\"\xC9diter\">\n                <img src=\"assets/edit.svg\" alt=\"\xC9diter\" class=\"btn-icon\">\n              </button>\n              <button class=\"btn-action btn-action-delete delete-piece-btn\" \n                      data-key=\"").concat(pieceKey, "\" \n                      title=\"Supprimer\">\n                <img src=\"assets/delete.svg\" alt=\"Supprimer\" class=\"btn-icon\">\n              </button>\n            </div>\n          </td>\n        </tr>\n      ");
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
    if (!this.controller.lockOptions.lockPieceCreation) {
      html += "\n        <tr class=\"add-row\">\n          <td colspan=\"8\">\n            <button id=\"add-piece-btn\" class=\"btn btn-sm btn-primary\">+ Ajouter une barre \xE0 d\xE9couper</button>\n          </td>\n        </tr>\n      ";
    }
    html += "</tbody></table>";
    tableContainer.innerHTML = html;

    // Configurer les gestionnaires d'événements
    if (!this.controller.lockOptions.lockPieceCreation) {
      var addBtn = document.getElementById('add-piece-btn');
      if (addBtn) {
        addBtn.addEventListener('click', function () {
          _this.controller.openPiecePanel('create');
        });
      }
    }
    document.querySelectorAll('.edit-piece-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-key');
        _this.controller.openPiecePanel('edit', key);
      });
    });
    document.querySelectorAll('.delete-piece-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-key');
        if (_this.controller.dataManager.deletePiece(key)) {
          _this.renderPiecesTable();
          _this.controller.updateAllProfileSelects();
        } else {
          _this.controller.showNotification('Erreur lors de la suppression', 'error');
        }
      });
    });
  },
  /**
   * Rend le tableau des barres mères avec tri automatique
   */
  renderStockBarsTable: function renderStockBarsTable() {
    var _this2 = this;
    var tableContainer = document.querySelector('#stock-bars-table');
    var data = this.controller.dataManager.getData();
    var allMotherBars = [];
    for (var profile in data.motherBars) {
      allMotherBars.push.apply(allMotherBars, edit_panels_toConsumableArray(data.motherBars[profile]));
    }
    var sortedBars = this.sortBars(allMotherBars);
    var html = "\n      <table class=\"data-table\">\n        <thead>\n          <tr>\n            <th>Profil</th>\n            <th>Longueur</th>\n            <th>Quantit\xE9</th>\n            <th>Actions</th>\n          </tr>\n        </thead>\n        <tbody>\n    ";
    var _iterator2 = edit_panels_createForOfIteratorHelper(sortedBars),
      _step2;
    try {
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
        var bar = _step2.value;
        var barKey = this.controller.dataManager.generateMotherBarKey(bar);
        var lengthInMilimeters = UIUtils.formatLenght(bar.length);
        html += "\n        <tr data-key=\"".concat(barKey, "\">\n          <td>").concat(bar.profile, "</td>\n          <td>").concat(lengthInMilimeters, " mm</td>\n          <td>").concat(bar.quantity, "</td>\n          <td>\n            <div class=\"action-buttons\">\n              <button class=\"btn-action btn-action-edit edit-stock-btn\" \n                      data-key=\"").concat(barKey, "\" \n                      title=\"\xC9diter\">\n                <img src=\"assets/edit.svg\" alt=\"\xC9diter\" class=\"btn-icon\">\n              </button>\n              <button class=\"btn-action btn-action-delete delete-stock-btn\" \n                      data-key=\"").concat(barKey, "\" \n                      title=\"Supprimer\">\n                <img src=\"assets/delete.svg\" alt=\"Supprimer\" class=\"btn-icon\">\n              </button>\n            </div>\n          </td>\n        </tr>\n      ");
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }
    html += "\n      <tr class=\"add-row\">\n        <td colspan=\"4\">\n          <button id=\"add-stock-btn\" class=\"btn btn-sm btn-primary\">+ Ajouter une barre m\xE8re</button>\n        </td>\n      </tr>\n    </tbody>\n    </table>\n    ";
    tableContainer.innerHTML = html;
    document.getElementById('add-stock-btn').addEventListener('click', function () {
      _this2.controller.openStockPanel('create');
    });
    document.querySelectorAll('.edit-stock-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-key');
        _this2.controller.openStockPanel('edit', key);
      });
    });
    document.querySelectorAll('.delete-stock-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-key');
        if (_this2.controller.dataManager.deleteMotherBar(key)) {
          _this2.renderStockBarsTable();
          _this2.controller.updateAllProfileSelects();
        } else {
          _this2.controller.showNotification('Erreur lors de la suppression', 'error');
        }
      });
    });
  },
  /**
   * Ouvre le panneau des barres filles
   */
  openPiecePanel: function openPiecePanel(mode) {
    var key = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var panel = document.getElementById('piece-panel');
    var form = panel.querySelector('.panel-form');
    var title = panel.querySelector('.panel-title');
    form.innerHTML = '';
    if (mode === 'edit') {
      var _item$angles, _item$angles2;
      var item = this.controller.dataManager.getPieceByKey(key);
      if (!item) return;
      title.textContent = "\xC9diter la barre ".concat(item.nom || item.profile);
      var lengthDisabled = this.controller.lockOptions.lockPieceLengths ? 'disabled' : '';
      var angleDisabled = this.controller.lockOptions.lockPieceAngles ? 'disabled' : '';
      form.innerHTML = "\n        <div class=\"form-group\">\n          <label for=\"piece-nom\">Nom :</label>\n          <input type=\"text\" id=\"piece-nom\" value=\"".concat(item.nom || '', "\" placeholder=\"Nom de la barre\">\n        </div>\n        <div class=\"form-group\">\n          <label for=\"piece-profile\">Profil :</label>\n          <div class=\"profile-input-container\">\n            <select id=\"piece-profile-select\" class=\"profile-select\">\n              <option value=\"custom\">Saisie personnalis\xE9e</option>\n              ").concat(this.controller.getProfileOptions(item.profile), "\n            </select>\n            <input type=\"text\" id=\"piece-profile\" class=\"profile-input\" value=\"").concat(item.profile, "\" placeholder=\"ex: HEA100\">\n          </div>\n        </div>\n        <div class=\"form-group\">\n          <label for=\"piece-orientation\">Orientation :</label>\n          <select id=\"piece-orientation\">\n            <option value=\"a-plat\" ").concat(item.orientation === 'a-plat' ? 'selected' : '', ">\xC0 plat</option>\n            <option value=\"debout\" ").concat(item.orientation === 'debout' ? 'selected' : '', ">Debout</option>\n          </select>\n        </div>\n        <div class=\"form-group\">\n          <label for=\"piece-quantity\">Quantit\xE9 :</label>\n          <input type=\"number\" id=\"piece-quantity\" min=\"1\" max=\"10000\" value=\"").concat(item.quantity, "\">\n        </div>\n        <div class=\"form-group\">\n          <label for=\"piece-length\">Longueur (mm) ").concat(this.controller.lockOptions.lockPieceLengths ? '(verrouillée)' : '', " :</label>\n          <input type=\"number\" id=\"piece-length\" min=\"1\" max=\"100000\" value=\"").concat(item.length, "\" ").concat(lengthDisabled, ">\n          ").concat(this.controller.lockOptions.lockPieceLengths ? '<small class="form-help">La longueur ne peut pas être modifiée pour les barres importées</small>' : '', "\n        </div>\n        <div class=\"form-group\">\n          <label for=\"piece-angle-1\">Angle 1 (\xB0) ").concat(this.controller.lockOptions.lockPieceAngles ? '(verrouillé)' : '', " :</label>\n          <input type=\"number\" id=\"piece-angle-1\" min=\"-360\" max=\"360\" step=\"0.01\" value=\"").concat(parseFloat(((_item$angles = item.angles) === null || _item$angles === void 0 ? void 0 : _item$angles[1]) || 90).toFixed(2), "\" ").concat(angleDisabled, ">\n          ").concat(this.controller.lockOptions.lockPieceAngles ? '<small class="form-help">Les angles ne peuvent pas être modifiés pour les barres importées</small>' : '', "\n        </div>\n        <div class=\"form-group\">\n          <label for=\"piece-angle-2\">Angle 2 (\xB0) ").concat(this.controller.lockOptions.lockPieceAngles ? '(verrouillé)' : '', " :</label>\n          <input type=\"number\" id=\"piece-angle-2\" min=\"-360\" max=\"360\" step=\"0.01\" value=\"").concat(parseFloat(((_item$angles2 = item.angles) === null || _item$angles2 === void 0 ? void 0 : _item$angles2[2]) || 90).toFixed(2), "\" ").concat(angleDisabled, ">\n        </div>\n      ");
      this.initializeProfileSystem(item.profile);
    } else {
      title.textContent = 'Nouvelle barre à découper';
      form.innerHTML = "\n        <div class=\"form-group\">\n          <label for=\"piece-nom\">Nom :</label>\n          <input type=\"text\" id=\"piece-nom\" placeholder=\"Nom de la barre (optionnel)\">\n        </div>\n        <div class=\"form-group\">\n          <label for=\"piece-profile\">Profil :</label>\n          <div class=\"profile-input-container\">\n            <select id=\"piece-profile-select\" class=\"profile-select\">\n              <option value=\"custom\">Saisie personnalis\xE9e</option>\n              ".concat(this.controller.getProfileOptions(), "\n            </select>\n            <input type=\"text\" id=\"piece-profile\" class=\"profile-input\" placeholder=\"ex: HEA100\">\n          </div>\n        </div>\n        <div class=\"form-group\">\n          <label for=\"piece-orientation\">Orientation :</label>\n          <select id=\"piece-orientation\">\n            <option value=\"a-plat\">\xC0 plat</option>\n            <option value=\"debout\">Debout</option>\n          </select>\n        </div>\n        <div class=\"form-group\">\n          <label for=\"piece-quantity\">Quantit\xE9 :</label>\n          <input type=\"number\" id=\"piece-quantity\" min=\"1\" max=\"10000\" value=\"1\">\n        </div>\n        <div class=\"form-group\">\n          <label for=\"piece-length\">Longueur (mm) :</label>\n          <input type=\"number\" id=\"piece-length\" min=\"1\" max=\"100000\" placeholder=\"ex: 300\">\n        </div>\n        <div class=\"form-group\">\n          <label for=\"piece-angle-1\">Angle 1 (\xB0) :</label>\n          <input type=\"number\" id=\"piece-angle-1\" min=\"-360\" max=\"360\" step=\"0.01\" value=\"90.00\">\n        </div>\n        <div class=\"form-group\">\n          <label for=\"piece-angle-2\">Angle 2 (\xB0) :</label>\n          <input type=\"number\" id=\"piece-angle-2\" min=\"-360\" max=\"360\" step=\"0.01\" value=\"90.00\">\n        </div>\n      ");
      this.initializeProfileSystem();
    }
    this.setupFormKeyHandlers();
    this.openPanel('piece-panel');
  },
  /**
   * Ouvre le panneau des barres mères
   */
  openStockPanel: function openStockPanel(mode) {
    var key = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var panel = document.getElementById('stock-panel');
    var form = panel.querySelector('.panel-form');
    var title = panel.querySelector('.panel-title');
    form.innerHTML = '';
    if (mode === 'edit') {
      var item = this.controller.dataManager.getMotherBarByKey(key);
      if (!item) return;
      title.textContent = "\xC9diter la barre m\xE8re ".concat(item.profile);
      var lengthInMilimeters = UIUtils.formatLenght(item.length);
      form.innerHTML = "\n        <div class=\"form-group\">\n          <label for=\"stock-profile\">Profil :</label>\n          <div class=\"profile-input-container\">\n            <select id=\"stock-profile-select\" class=\"profile-select\">\n              <option value=\"custom\">Saisie personnalis\xE9e</option>\n              ".concat(this.controller.getProfileOptions(item.profile), "\n            </select>\n            <input type=\"text\" id=\"stock-profile\" class=\"profile-input\" value=\"").concat(item.profile, "\" placeholder=\"ex: HEA100\">\n          </div>\n          <small class=\"form-help\">S\xE9lectionnez un profil existant ou saisissez-en un nouveau</small>\n        </div>\n        <div class=\"form-group\">\n          <label for=\"stock-length\">Longueur (mm) :</label>\n          <input type=\"text\" id=\"stock-length\" value=\"").concat(lengthInMilimeters, "\" placeholder=\"ex : 12000\">\n          <small class=\"form-help\">Saisissez la longueur en milim\xE8tres</small>\n        </div>\n        <div class=\"form-group\">\n          <label for=\"stock-quantity\">Quantit\xE9 :</label>\n          <input type=\"number\" id=\"stock-quantity\" min=\"1\" max=\"1000000\" value=\"").concat(item.quantity, "\">\n          <small class=\"form-help\">Quantit\xE9 disponible (1000000 = illimit\xE9e)</small>\n        </div>\n      ");

      // Initialiser le système de profil pour les barres mères
      this.initializeStockProfileSystem(item.profile);
    } else {
      title.textContent = 'Nouvelle barre mère';
      form.innerHTML = "\n        <div class=\"form-group\">\n          <label for=\"stock-profile\">Profil :</label>\n          <div class=\"profile-input-container\">\n            <select id=\"stock-profile-select\" class=\"profile-select\">\n              <option value=\"custom\">Saisie personnalis\xE9e</option>\n              ".concat(this.controller.getProfileOptions(), "\n            </select>\n            <input type=\"text\" id=\"stock-profile\" class=\"profile-input\" placeholder=\"ex: HEA100\">\n          </div>\n          <small class=\"form-help\">S\xE9lectionnez un profil existant ou saisissez-en un nouveau</small>\n        </div>\n        <div class=\"form-group\">\n          <label for=\"stock-length\">Longueur (mm) :</label>\n          <input type=\"text\" id=\"stock-length\" placeholder=\"ex : 12000\">\n          <small class=\"form-help\">Saisissez la longueur en milim\xE8tres</small>\n        </div>\n        <div class=\"form-group\">\n          <label for=\"stock-quantity\">Quantit\xE9 :</label>\n          <input type=\"number\" id=\"stock-quantity\" min=\"1\" max=\"1000000\" value=\"1000000\">\n          <small class=\"form-help\">Quantit\xE9 disponible (1000000 = illimit\xE9e)</small>\n        </div>\n      ");

      // MODIFIÉ: Initialiser le système de profil avec le premier profil disponible
      this.initializeStockProfileSystemForNew();
    }
    var lengthInput = document.getElementById('stock-length');
    if (lengthInput) {
      this.setupLengthInputHandlers(lengthInput);
    }
    this.setupFormKeyHandlers();
    this.openPanel('stock-panel');

    // MODIFIÉ: Focus sur le champ longueur pour les nouvelles barres mères
    if (mode === 'create') {
      setTimeout(function () {
        var lengthField = document.getElementById('stock-length');
        if (lengthField) {
          lengthField.focus();
          lengthField.select();
          console.log('🎯 Focus automatique sur le champ longueur pour nouvelle barre mère');
        }
      }, 400);
    }
  },
  /**
   * Ferme le panneau d'édition actif
   */
  closePanel: function closePanel() {
    var panels = ['piece-panel', 'stock-panel'];
    var overlay = document.getElementById('panel-overlay');
    panels.forEach(function (panelId) {
      var panel = document.getElementById(panelId);
      if (panel) panel.classList.remove('visible');
    });
    if (overlay) overlay.classList.remove('visible');
    document.body.classList.remove('panel-open');
    this.removeGlobalKeyHandlers();
    this.controller.editingKey = null;
    this.controller.editingType = null;
    this.controller.editingMode = null;
  },
  /**
   * Ouvre un panneau générique
   */
  openPanel: function openPanel(panelId) {
    console.log('🔧 Ouverture du panneau:', panelId);
    var panel = document.getElementById(panelId);
    var overlay = document.getElementById('panel-overlay');
    if (!panel) {
      console.error('❌ Panneau non trouvé:', panelId);
      return;
    }
    if (!overlay) {
      console.error('❌ Overlay non trouvé');
      return;
    }
    document.body.classList.add('panel-open');
    console.log('🔒 Défilement de la page bloqué');
    panel.classList.add('visible');
    overlay.classList.add('visible');
    console.log('👁️ Panneau et overlay affichés');

    // MODIFIÉ: Ne pas faire de focus automatique ici, c'est géré dans openStockPanel
    // Le focus sera fait spécifiquement pour chaque type de panneau
  },
  /**
   * Initialise le système de profil avec dropdown et champ éditable
   */
  initializeProfileSystem: function initializeProfileSystem() {
    var currentValue = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    var profileSelect = document.getElementById('piece-profile-select');
    var profileInput = document.getElementById('piece-profile');
    if (!profileSelect || !profileInput) return;
    var isCustomMode = false;
    if (currentValue && currentValue.trim() !== '') {
      var matchingOption = Array.from(profileSelect.options).find(function (option) {
        return option.value === currentValue && option.value !== 'custom';
      });
      if (matchingOption) {
        profileSelect.value = currentValue;
        profileInput.value = currentValue;
        profileInput.readOnly = true;
        isCustomMode = false;
      } else {
        profileSelect.value = 'custom';
        profileInput.value = currentValue;
        profileInput.readOnly = false;
        isCustomMode = true;
      }
    } else {
      profileSelect.value = 'custom';
      profileInput.value = '';
      profileInput.readOnly = false;
      isCustomMode = true;
    }
    profileSelect.addEventListener('change', function () {
      if (profileSelect.value === 'custom') {
        profileInput.readOnly = false;
        profileInput.focus();
        profileInput.select();
      } else {
        profileInput.value = profileSelect.value;
        profileInput.readOnly = true;
      }
    });
    profileInput.addEventListener('click', function () {
      if (profileInput.readOnly) {
        profileSelect.value = 'custom';
        profileInput.readOnly = false;
        profileInput.focus();
        profileInput.select();
      }
    });
    profileInput.addEventListener('input', function () {
      if (!profileInput.readOnly) {
        if (profileSelect.value !== 'custom') {
          profileSelect.value = 'custom';
        }
      }
    });
    profileInput.addEventListener('focus', function () {
      if (profileInput.readOnly) {
        profileSelect.value = 'custom';
        profileInput.readOnly = false;
        setTimeout(function () {
          profileInput.focus();
          profileInput.select();
        }, 0);
      }
    });
    this.updateProfileInputStyles(profileInput, isCustomMode);
  },
  /**
   * Met à jour les styles visuels du champ de profil
   */
  updateProfileInputStyles: function updateProfileInputStyles(profileInput, isCustomMode) {
    if (isCustomMode) {
      profileInput.classList.add('custom-mode');
      profileInput.classList.remove('readonly-mode');
    } else {
      profileInput.classList.add('readonly-mode');
      profileInput.classList.remove('custom-mode');
    }
  },
  /**
   * Initialise le système de profil pour les barres mères avec dropdown et champ éditable
   */
  initializeStockProfileSystem: function initializeStockProfileSystem() {
    var _this3 = this;
    var currentValue = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    var profileSelect = document.getElementById('stock-profile-select');
    var profileInput = document.getElementById('stock-profile');
    if (!profileSelect || !profileInput) return;
    var isCustomMode = false;
    if (currentValue && currentValue.trim() !== '') {
      var matchingOption = Array.from(profileSelect.options).find(function (option) {
        return option.value === currentValue && option.value !== 'custom';
      });
      if (matchingOption) {
        profileSelect.value = currentValue;
        profileInput.value = currentValue;
        profileInput.readOnly = true;
        isCustomMode = false;
      } else {
        profileSelect.value = 'custom';
        profileInput.value = currentValue;
        profileInput.readOnly = false;
        isCustomMode = true;
      }
    } else {
      profileSelect.value = 'custom';
      profileInput.value = '';
      profileInput.readOnly = false;
      isCustomMode = true;
    }
    profileSelect.addEventListener('change', function () {
      if (profileSelect.value === 'custom') {
        profileInput.readOnly = false;
        profileInput.focus();
        profileInput.select();
      } else {
        profileInput.value = profileSelect.value;
        profileInput.readOnly = true;
      }

      // Mettre à jour les styles
      _this3.updateProfileInputStyles(profileInput, profileSelect.value === 'custom');
    });
    profileInput.addEventListener('click', function () {
      if (profileInput.readOnly) {
        profileSelect.value = 'custom';
        profileInput.readOnly = false;
        profileInput.focus();
        profileInput.select();
        _this3.updateProfileInputStyles(profileInput, true);
      }
    });
    profileInput.addEventListener('input', function () {
      if (!profileInput.readOnly) {
        if (profileSelect.value !== 'custom') {
          profileSelect.value = 'custom';
        }
      }
    });
    profileInput.addEventListener('focus', function () {
      if (profileInput.readOnly) {
        profileSelect.value = 'custom';
        profileInput.readOnly = false;
        setTimeout(function () {
          profileInput.focus();
          profileInput.select();
        }, 0);
        _this3.updateProfileInputStyles(profileInput, true);
      }
    });
  },
  /**
   * NOUVEAU: Initialise le système de profil pour les nouvelles barres mères avec le premier profil disponible
   */
  initializeStockProfileSystemForNew: function initializeStockProfileSystemForNew() {
    var _this4 = this;
    var profileSelect = document.getElementById('stock-profile-select');
    var profileInput = document.getElementById('stock-profile');
    if (!profileSelect || !profileInput) return;

    // Chercher le premier profil disponible (non "custom")
    var firstAvailableProfile = Array.from(profileSelect.options).find(function (option) {
      return option.value !== 'custom';
    });
    if (firstAvailableProfile) {
      // Utiliser le premier profil disponible
      profileSelect.value = firstAvailableProfile.value;
      profileInput.value = firstAvailableProfile.value;
      profileInput.readOnly = true;
      this.updateProfileInputStyles(profileInput, false); // false = pas en mode custom
    } else {
      // Pas de profil disponible, utiliser le mode custom
      profileSelect.value = 'custom';
      profileInput.value = '';
      profileInput.readOnly = false;
      this.updateProfileInputStyles(profileInput, true); // true = mode custom
    }

    // Configurer les gestionnaires d'événements
    profileSelect.addEventListener('change', function () {
      if (profileSelect.value === 'custom') {
        profileInput.readOnly = false;
        profileInput.focus();
        profileInput.select();
      } else {
        profileInput.value = profileSelect.value;
        profileInput.readOnly = true;
      }

      // Mettre à jour les styles
      _this4.updateProfileInputStyles(profileInput, profileSelect.value === 'custom');
    });
    profileInput.addEventListener('click', function () {
      if (profileInput.readOnly) {
        profileSelect.value = 'custom';
        profileInput.readOnly = false;
        profileInput.focus();
        profileInput.select();
        _this4.updateProfileInputStyles(profileInput, true);
      }
    });
    profileInput.addEventListener('input', function () {
      if (!profileInput.readOnly) {
        if (profileSelect.value !== 'custom') {
          profileSelect.value = 'custom';
        }
      }
    });
    profileInput.addEventListener('focus', function () {
      if (profileInput.readOnly) {
        profileSelect.value = 'custom';
        profileInput.readOnly = false;
        setTimeout(function () {
          profileInput.focus();
          profileInput.select();
        }, 0);
        _this4.updateProfileInputStyles(profileInput, true);
      }
    });
  },
  /**
   * Configure les gestionnaires pour les champs de longueur
   */
  setupLengthInputHandlers: function setupLengthInputHandlers(inputElement) {
    var _this5 = this;
    inputElement.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        _this5.controller.saveItem();
      }
    });
    inputElement.addEventListener('blur', function (e) {
      var value = e.target.value.trim();
      if (value !== '') {
        var parsed = EditValidation.parseLengthFromDisplay(value);
        if (parsed !== null) {
          e.target.value = UIUtils.formatLenght(parsed);
        }
      }
    });
  },
  /**
   * Configure les gestionnaires pour tous les champs du formulaire
   */
  setupFormKeyHandlers: function setupFormKeyHandlers() {
    var _this6 = this;
    var form = document.querySelector('.panel-form');
    if (!form) return;
    var globalKeyHandler = function globalKeyHandler(e) {
      if (e.key === 'Enter') {
        var piecePanel = document.getElementById('piece-panel');
        var stockPanel = document.getElementById('stock-panel');
        var isPanelOpen = piecePanel && piecePanel.classList.contains('visible') || stockPanel && stockPanel.classList.contains('visible');
        if (isPanelOpen) {
          e.preventDefault();
          e.stopPropagation();
          _this6.controller.saveItem();
        }
      }
    };
    if (this._globalKeyHandler) {
      document.removeEventListener('keydown', this._globalKeyHandler);
    }
    this._globalKeyHandler = globalKeyHandler;
    document.addEventListener('keydown', this._globalKeyHandler);
    form.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        _this6.controller.saveItem();
      }
    });
  },
  /**
   * Supprime les gestionnaires d'événements globaux
   */
  removeGlobalKeyHandlers: function removeGlobalKeyHandlers() {
    if (this._globalKeyHandler) {
      document.removeEventListener('keydown', this._globalKeyHandler);
      this._globalKeyHandler = null;
    }
  },
  /**
   * Crée le panneau des barres filles
   */
  createPiecePanel: function createPiecePanel() {
    var _this7 = this;
    if (document.getElementById('piece-panel')) return;
    if (!document.getElementById('panel-overlay')) {
      var overlay = document.createElement('div');
      overlay.id = 'panel-overlay';
      overlay.className = 'panel-overlay';
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          _this7.closePanel();
        }
      });
      overlay.addEventListener('wheel', function (e) {
        e.preventDefault();
      }, {
        passive: false
      });
      document.body.appendChild(overlay);
    }
    var panel = document.createElement('div');
    panel.id = 'piece-panel';
    panel.className = 'side-panel piece-panel';
    panel.innerHTML = "\n      <div class=\"panel-header\">\n        <h3 class=\"panel-title\">Barre \xE0 d\xE9couper</h3>\n        <button class=\"panel-close\">&times;</button>\n      </div>\n      <div class=\"panel-form\">\n        <!-- Le contenu du formulaire sera g\xE9n\xE9r\xE9 dynamiquement -->\n      </div>\n      <div class=\"panel-actions\">\n        <button class=\"btn btn-secondary cancel-btn\">Annuler</button>\n        <button class=\"btn btn-primary save-btn\">Enregistrer</button>\n      </div>\n    ";
    document.body.appendChild(panel);
    panel.querySelector('.panel-close').addEventListener('click', function () {
      return _this7.closePanel();
    });
    panel.querySelector('.cancel-btn').addEventListener('click', function () {
      return _this7.closePanel();
    });
    panel.querySelector('.save-btn').addEventListener('click', function () {
      return _this7.controller.saveItem();
    });
  },
  /**
   * Crée le panneau des barres mères
   */
  createStockPanel: function createStockPanel() {
    var _this8 = this;
    if (document.getElementById('stock-panel')) return;
    if (!document.getElementById('panel-overlay')) {
      var overlay = document.createElement('div');
      overlay.id = 'panel-overlay';
      overlay.className = 'panel-overlay';
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          _this8.closePanel();
        }
      });
      overlay.addEventListener('wheel', function (e) {
        e.preventDefault();
      }, {
        passive: false
      });
      document.body.appendChild(overlay);
    }
    var panel = document.createElement('div');
    panel.id = 'stock-panel';
    panel.className = 'side-panel stock-panel';
    panel.innerHTML = "\n      <div class=\"panel-header\">\n        <h3 class=\"panel-title\">Barre m\xE8re</h3>\n        <button class=\"panel-close\">&times;</button>\n      </div>\n      <div class=\"panel-form\">\n        <!-- Le contenu du formulaire sera g\xE9n\xE9r\xE9 dynamiquement -->\n      </div>\n      <div class=\"panel-actions\">\n        <button class=\"btn btn-secondary cancel-btn\">Annuler</button>\n        <button class=\"btn btn-primary save-btn\">Enregistrer</button>\n      </div>\n    ";
    document.body.appendChild(panel);
    panel.querySelector('.panel-close').addEventListener('click', function () {
      return _this8.closePanel();
    });
    panel.querySelector('.cancel-btn').addEventListener('click', function () {
      return _this8.closePanel();
    });
    panel.querySelector('.save-btn').addEventListener('click', function () {
      return _this8.controller.saveItem();
    });
  }
};
;// ./src/js/ui/edit-controller.js
function edit_controller_typeof(o) { "@babel/helpers - typeof"; return edit_controller_typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, edit_controller_typeof(o); }
function edit_controller_createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = edit_controller_unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function edit_controller_toConsumableArray(r) { return edit_controller_arrayWithoutHoles(r) || edit_controller_iterableToArray(r) || edit_controller_unsupportedIterableToArray(r) || edit_controller_nonIterableSpread(); }
function edit_controller_nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function edit_controller_unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return edit_controller_arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? edit_controller_arrayLikeToArray(r, a) : void 0; } }
function edit_controller_iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function edit_controller_arrayWithoutHoles(r) { if (Array.isArray(r)) return edit_controller_arrayLikeToArray(r); }
function edit_controller_arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function edit_controller_ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function edit_controller_objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? edit_controller_ownKeys(Object(t), !0).forEach(function (r) { edit_controller_defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : edit_controller_ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function edit_controller_defineProperty(e, r, t) { return (r = edit_controller_toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function edit_controller_toPropertyKey(t) { var i = edit_controller_toPrimitive(t, "string"); return "symbol" == edit_controller_typeof(i) ? i : i + ""; }
function edit_controller_toPrimitive(t, r) { if ("object" != edit_controller_typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != edit_controller_typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }




/**
 * Contrôleur principal de l'édition (SANS ID)
 */
var EditController = {
  // Dépendances
  dataManager: null,
  showNotification: null,
  refreshDataDisplay: null,
  // État interne
  editingKey: null,
  editingType: null,
  editingMode: null,
  // Options de verrouillage
  lockOptions: {
    lockPieceCreation: true,
    lockPieceAngles: true,
    lockPieceLengths: true
  },
  /**
   * Initialise le contrôleur d'édition
   */
  init: function init(options) {
    this.dataManager = options.dataManager;
    this.showNotification = options.showNotification;
    this.refreshDataDisplay = options.refreshDataDisplay;
    if (options.lockOptions) {
      this.lockOptions = edit_controller_objectSpread(edit_controller_objectSpread({}, this.lockOptions), options.lockOptions);
    }

    // Initialiser les panneaux
    EditPanels.init(this);

    // Initialiser les boutons de reset
    this.initResetButton();
    this.initResetMotherBarsButton();
  },
  /**
   * Point d'entrée principal pour le rendu
   */
  renderSection: function renderSection() {
    EditPanels.renderPiecesTable();
    EditPanels.renderStockBarsTable();
  },
  /**
   * Alias pour la rétrocompatibilité
   */
  refreshTables: function refreshTables() {
    this.renderSection();
  },
  /**
   * Initialise le bouton de reset des barres filles
   */
  initResetButton: function initResetButton() {
    var _this = this;
    var resetBtn = document.getElementById('reset-pieces-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        _this.resetAllPieces();
      });
    }
  },
  /**
   * Supprime toutes les barres filles
   */
  resetAllPieces: function resetAllPieces() {
    var _this2 = this;
    var data = this.dataManager.getData();
    var totalPieces = 0;
    for (var profile in data.pieces) {
      totalPieces += data.pieces[profile].length;
    }
    if (totalPieces === 0) {
      this.showNotification('Aucune barre à découper à supprimer', 'info');
      return;
    }
    var deletedCount = 0;
    for (var _profile in data.pieces) {
      var pieces = edit_controller_toConsumableArray(data.pieces[_profile]);
      pieces.forEach(function (piece) {
        var key = _this2.dataManager.generatePieceKey(piece);
        if (_this2.dataManager.deletePiece(key)) {
          deletedCount++;
        }
      });
    }
    EditPanels.renderPiecesTable();
    this.updateAllProfileSelects();
    this.showNotification("".concat(deletedCount, " barre").concat(deletedCount > 1 ? 's' : '', " \xE0 d\xE9couper supprim\xE9e").concat(deletedCount > 1 ? 's' : ''), 'success');
    if (this.refreshDataDisplay) {
      this.refreshDataDisplay();
    }
  },
  /**
   * Initialise le bouton de reset des barres mères
   */
  initResetMotherBarsButton: function initResetMotherBarsButton() {
    var _this3 = this;
    var resetBtn = document.getElementById('reset-mother-bars-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        return _this3.resetAllMotherBars();
      });
    }
  },
  /**
   * Supprime toutes les barres mères avec confirmation
   */
  resetAllMotherBars: function resetAllMotherBars() {
    var _this4 = this;
    var data = this.dataManager.getData();
    var totalMotherBars = 0;
    for (var profile in data.motherBars) {
      totalMotherBars += data.motherBars[profile].length;
    }
    if (totalMotherBars === 0) {
      this.showNotification('Aucune barre mère à supprimer', 'info');
      return;
    }
    var deletedCount = 0;
    for (var _profile2 in data.motherBars) {
      var motherBars = edit_controller_toConsumableArray(data.motherBars[_profile2]);
      motherBars.forEach(function (motherBar) {
        var key = _this4.dataManager.generateMotherBarKey(motherBar);
        if (_this4.dataManager.deleteMotherBar(key)) {
          deletedCount++;
        }
      });
    }
    this.dataManager.clearStoredMotherBars();
    EditPanels.renderStockBarsTable();
    this.updateAllProfileSelects();
    this.showNotification("".concat(deletedCount, " barre").concat(deletedCount > 1 ? 's' : '', " m\xE8re").concat(deletedCount > 1 ? 's' : '', " supprim\xE9e").concat(deletedCount > 1 ? 's' : ''), 'success');
    if (this.refreshDataDisplay) {
      this.refreshDataDisplay();
    }
  },
  /**
   * Ouvre le panneau des barres filles
   */
  openPiecePanel: function openPiecePanel(mode) {
    var key = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    if (mode === 'create' && this.lockOptions.lockPieceCreation) {
      this.showNotification('La création de nouvelles barres filles est désactivée', 'warning');
      return;
    }
    this.editingMode = mode;
    this.editingKey = key;
    this.editingType = 'piece';
    EditPanels.openPiecePanel(mode, key);
  },
  /**
   * Ouvre le panneau des barres mères
   */
  openStockPanel: function openStockPanel(mode) {
    var key = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    this.editingMode = mode;
    this.editingKey = key;
    this.editingType = 'stock';
    EditPanels.openStockPanel(mode, key);
  },
  /**
   * Enregistre les modifications ou crée un nouvel élément
   */
  saveItem: function saveItem() {
    var type = this.editingType;
    var key = this.editingKey;
    var mode = this.editingMode;
    if (!type) return;
    var success = false;
    var updatedProfile = false;
    if (type === 'piece') {
      var formData = UIUtils.trimFormData({
        nom: document.getElementById('piece-nom').value,
        profile: document.getElementById('piece-profile').value,
        quantity: document.getElementById('piece-quantity').value,
        orientation: document.getElementById('piece-orientation').value
      });
      var nom = formData.nom;
      var profileValue = formData.profile;
      var quantity = parseInt(formData.quantity, 10);
      var orientation = formData.orientation;
      var length = null;
      var angle1 = 90,
        angle2 = 90;
      if (!this.lockOptions.lockPieceLengths) {
        var lengthInput = document.getElementById('piece-length').value.trim();
        length = parseInt(lengthInput, 10);
      } else if (mode === 'edit') {
        var item = this.dataManager.getPieceByKey(key);
        length = item ? item.length : null;
      }
      if (!this.lockOptions.lockPieceAngles) {
        var angle1Input = document.getElementById('piece-angle-1').value.trim();
        var angle2Input = document.getElementById('piece-angle-2').value.trim();
        angle1 = parseFloat(angle1Input);
        angle2 = parseFloat(angle2Input);
      } else if (mode === 'edit') {
        var _item$angles, _item$angles2;
        var _item = this.dataManager.getPieceByKey(key);
        angle1 = _item ? ((_item$angles = _item.angles) === null || _item$angles === void 0 ? void 0 : _item$angles[1]) || 90 : 90;
        angle2 = _item ? ((_item$angles2 = _item.angles) === null || _item$angles2 === void 0 ? void 0 : _item$angles2[2]) || 90 : 90;
      }
      var pieceData = {
        nom: nom,
        profile: profileValue,
        length: length,
        quantity: quantity,
        orientation: orientation,
        angles: {
          1: angle1,
          2: angle2
        }
      };
      var errors = EditValidation.validatePieceData(pieceData);
      if (errors.length > 0) {
        this.showNotification(errors[0], 'error');
        return;
      }
      if (profileValue && length && quantity) {
        if (mode === 'edit') {
          var piece = this.dataManager.getPieceByKey(key);
          if (piece && piece.profile !== profileValue) {
            updatedProfile = true;
          }
          var updatedPiece = {
            nom: nom,
            profile: profileValue,
            length: length,
            quantity: quantity,
            orientation: orientation,
            angles: {
              1: angle1,
              2: angle2
            }
          };
          var newKey = this.dataManager.updatePiece(key, updatedPiece);
          success = newKey !== null;
        } else {
          var _pieceData = {
            nom: nom,
            profile: profileValue,
            length: length,
            quantity: quantity,
            orientation: orientation,
            angles: {
              1: angle1,
              2: angle2
            },
            type: 'fille'
          };
          var addedKeys = this.dataManager.addBars([_pieceData]);
          if (addedKeys.length > 0) {
            success = true;
            updatedProfile = true;
          }
        }
        if (success) {
          EditPanels.renderPiecesTable();
          if (updatedProfile) {
            this.updateAllProfileSelects();
          }
          if (this.refreshDataDisplay) {
            this.refreshDataDisplay();
          }
          if (mode === 'edit') {
            this.showNotification("Barre modifi\xE9e", 'success');
          }
        }
      }
    } else if (type === 'stock') {
      // MODIFIÉ: Récupérer la valeur depuis le champ input au lieu du select
      var _formData = UIUtils.trimFormData({
        profile: document.getElementById('stock-profile').value,
        length: document.getElementById('stock-length').value,
        quantity: document.getElementById('stock-quantity').value
      });
      var _profileValue = _formData.profile;
      var _lengthInput = _formData.length;
      var _quantity = parseInt(_formData.quantity, 10);
      var lengthInMm = EditValidation.parseLengthFromDisplay(_lengthInput);
      var motherBarData = {
        profile: _profileValue,
        length: lengthInMm,
        quantity: _quantity
      };
      var _errors = EditValidation.validateMotherBarData(motherBarData);
      if (_errors.length > 0) {
        this.showNotification(_errors[0], 'error');
        return;
      }
      if (_profileValue && lengthInMm && _quantity) {
        if (mode === 'edit') {
          var bar = this.dataManager.getMotherBarByKey(key);
          if (bar && bar.profile !== _profileValue) {
            updatedProfile = true;
          }
          var updatedMotherBar = {
            profile: _profileValue,
            length: lengthInMm,
            quantity: _quantity
          };
          var _newKey = this.dataManager.updateMotherBar(key, updatedMotherBar);
          success = _newKey !== null;
        } else {
          var barData = {
            profile: _profileValue,
            length: lengthInMm,
            quantity: _quantity,
            type: 'mother'
          };
          var _addedKeys = this.dataManager.addBars([barData]);
          if (_addedKeys.length > 0) {
            success = true;
            updatedProfile = true;
          }
        }
        if (success) {
          EditPanels.renderStockBarsTable();
          if (updatedProfile) {
            this.updateAllProfileSelects();
          }
          if (this.refreshDataDisplay) {
            this.refreshDataDisplay();
          }
          if (mode === 'edit') {
            this.showNotification("Barre m\xE8re modifi\xE9e", 'success');
          }
        }
      }
    }
    if (success) {
      EditPanels.closePanel();
    } else {
      this.showNotification('Erreur lors de l\'enregistrement', 'error');
    }
  },
  /**
   * Met à jour toutes les listes déroulantes de profils
   */
  updateAllProfileSelects: function updateAllProfileSelects() {
    // Mettre à jour le select des barres mères
    var stockProfileSelect = document.getElementById('stock-profile-select');
    if (stockProfileSelect) {
      var currentValue = stockProfileSelect.value;
      var customOption = '<option value="custom">Saisie personnalisée</option>';
      stockProfileSelect.innerHTML = customOption + this.getProfileOptions(currentValue === 'custom' ? '' : currentValue);
    }

    // Mettre à jour le select des barres filles
    var pieceProfileSelect = document.getElementById('piece-profile-select');
    if (pieceProfileSelect) {
      var _currentValue = pieceProfileSelect.value;
      var _customOption = '<option value="custom">Saisie personnalisée</option>';
      pieceProfileSelect.innerHTML = _customOption + this.getProfileOptions(_currentValue === 'custom' ? '' : _currentValue);
    }
  },
  /**
   * Obtient la liste des options de profil pour les selects
   */
  getProfileOptions: function getProfileOptions(currentValue) {
    var data = this.dataManager.getData();
    var profiles = new Set();
    for (var profile in data.pieces) {
      profiles.add(profile);
    }
    for (var _profile3 in data.motherBars) {
      profiles.add(_profile3);
    }
    var optionsHtml = '';
    var _iterator = edit_controller_createForOfIteratorHelper(profiles),
      _step;
    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var _profile4 = _step.value;
        var selected = _profile4 === currentValue ? 'selected' : '';
        optionsHtml += "<option value=\"".concat(_profile4, "\" ").concat(selected, ">").concat(_profile4, "</option>");
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
    return optionsHtml;
  }
};
;// ./src/js/ui/import-handler.js
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
/**
 * Gestionnaire de la section d'import
 * Gère le drag & drop et l'import de fichiers (SANS ID - VERSION FINALE)
 */

var ImportHandler = {
  // Dépendances
  dataManager: null,
  importManager: null,
  // Callbacks
  showNotification: null,
  refreshDataDisplay: null,
  /**
   * Initialise le handler d'import
   */
  init: function init(options) {
    this.dataManager = options.dataManager;
    this.importManager = options.importManager;
    this.showNotification = options.showNotification;
    this.refreshDataDisplay = options.refreshDataDisplay;
    this.initDropZone();
  },
  /**
   * Initialise la zone de drop
   */
  initDropZone: function initDropZone() {
    var _this = this;
    var dropZone = document.querySelector('.file-drop-zone');
    var fileInput = document.getElementById('nc2-files-input');

    // Ajouter un conteneur pour les erreurs s'il n'existe pas
    if (!document.getElementById('import-error')) {
      var errorDiv = document.createElement('div');
      errorDiv.id = 'import-error';
      errorDiv.className = 'error-message hidden';
      dropZone.parentNode.insertBefore(errorDiv, dropZone.nextSibling);
    }

    // Prévenir les comportements par défaut du navigateur
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (eventName) {
      dropZone.addEventListener(eventName, function (e) {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    // Ajouter/retirer la classe active pendant le drag
    ['dragenter', 'dragover'].forEach(function (eventName) {
      dropZone.addEventListener(eventName, function () {
        return dropZone.classList.add('active');
      });
    });
    ['dragleave', 'drop'].forEach(function (eventName) {
      dropZone.addEventListener(eventName, function () {
        return dropZone.classList.remove('active');
      });
    });

    // Gérer le drop
    dropZone.addEventListener('drop', function (e) {
      return _this.processImportedFiles(e.dataTransfer.files);
    });

    // Gérer le clic sur l'input file
    fileInput.addEventListener('change', function () {
      return _this.processImportedFiles(fileInput.files);
    });

    // Gérer le clic sur la zone de drop pour ouvrir le sélecteur de fichiers
    dropZone.addEventListener('click', function (e) {
      // Ne pas déclencher si clic sur l'input lui-même (évite double ouverture)
      if (e.target !== fileInput) {
        fileInput.click();
      }
    });
  },
  /**
   * Traite les fichiers importés (MODIFIÉ - Utilise le simple overlay)
   */
  processImportedFiles: function () {
    var _processImportedFiles = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(files) {
      var importedBars, addedKeys, fileInput, _t;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.p = _context.n) {
          case 0:
            if (!(files.length === 0)) {
              _context.n = 1;
              break;
            }
            return _context.a(2);
          case 1:
            // MODIFIÉ: Utiliser le simple overlay au lieu de l'overlay complexe
            UIUtils.showSimpleLoadingOverlay('Traitement des fichiers en cours...');
            this.hideError();
            _context.p = 2;
            _context.n = 3;
            return this.importManager.processMultipleFiles(files);
          case 3:
            importedBars = _context.v;
            if (importedBars && importedBars.length > 0) {
              // Ajouter les barres au DataManager
              addedKeys = this.dataManager.addBars(importedBars);
              if (addedKeys.length > 0) {
                // Rester sur la même section et montrer un message de succès
                this.showNotification("".concat(addedKeys.length, " barres import\xE9es avec succ\xE8s."), 'success');

                // Rafraîchir l'affichage des données
                if (this.refreshDataDisplay) {
                  this.refreshDataDisplay();
                }

                // Faire défiler jusqu'à la zone d'édition après un court délai
                setTimeout(function () {
                  var editPanel = document.querySelector('.panels-container');
                  if (editPanel) {
                    editPanel.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start'
                    });
                  }
                }, 300);
              } else {
                this.showError('Aucune nouvelle pièce ajoutée.');
              }
            } else {
              this.showError('Aucune pièce valide trouvée dans les fichiers.');
            }
            _context.n = 5;
            break;
          case 4:
            _context.p = 4;
            _t = _context.v;
            console.error('Import error:', _t);
            this.showError("Erreur d'import: ".concat(_t.message));
          case 5:
            _context.p = 5;
            // MODIFIÉ: Masquer le simple overlay
            UIUtils.hideSimpleLoadingOverlay();

            // Réinitialiser l'élément input file pour permettre la réimportation du même fichier
            fileInput = document.getElementById('nc2-files-input');
            if (fileInput) {
              fileInput.value = '';
            }
            return _context.f(5);
          case 6:
            return _context.a(2);
        }
      }, _callee, this, [[2, 4, 5, 6]]);
    }));
    function processImportedFiles(_x) {
      return _processImportedFiles.apply(this, arguments);
    }
    return processImportedFiles;
  }(),
  /**
   * MODIFIÉ: Traite les fichiers sans notifications de succès (CORRIGÉ - plus de référence ID)
   */
  processFiles: function () {
    var _processFiles = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(files) {
      var results, addedKeys, errorMsg, _t2;
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.p = _context2.n) {
          case 0:
            if (!(!files || files.length === 0)) {
              _context2.n = 1;
              break;
            }
            return _context2.a(2);
          case 1:
            // MODIFIÉ: Utiliser le simple overlay
            UIUtils.showSimpleLoadingOverlay('Traitement des fichiers...');
            _context2.p = 2;
            _context2.n = 3;
            return this.importManager.processFiles(files);
          case 3:
            results = _context2.v;
            if (results.success.length > 0) {
              addedKeys = this.dataManager.addBars(results.bars);
              if (addedKeys.length > 0) {
                if (this.refreshDataDisplay) {
                  this.refreshDataDisplay();
                }
                // SUPPRIMÉ: Notification de succès
              }
            }

            // Afficher seulement les erreurs
            if (results.errors.length > 0) {
              errorMsg = results.errors.length === 1 ? results.errors[0] : "".concat(results.errors.length, " erreurs d'import");
              this.showNotification(errorMsg, 'error');
            }
            _context2.n = 5;
            break;
          case 4:
            _context2.p = 4;
            _t2 = _context2.v;
            console.error('Erreur lors du traitement des fichiers:', _t2);
            this.showNotification('Erreur lors de l\'import', 'error');
          case 5:
            _context2.p = 5;
            // MODIFIÉ: Masquer le simple overlay
            UIUtils.hideSimpleLoadingOverlay();
            return _context2.f(5);
          case 6:
            return _context2.a(2);
        }
      }, _callee2, this, [[2, 4, 5, 6]]);
    }));
    function processFiles(_x2) {
      return _processFiles.apply(this, arguments);
    }
    return processFiles;
  }(),
  /**
   * Affiche une erreur d'import
   */
  showError: function showError(message) {
    var errorDiv = document.getElementById('import-error');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.remove('hidden');
    }
  },
  /**
   * Masque l'erreur d'import
   */
  hideError: function hideError() {
    var errorDiv = document.getElementById('import-error');
    if (errorDiv) {
      errorDiv.classList.add('hidden');
    }
  }
};
// EXTERNAL MODULE: ./node_modules/jszip/dist/jszip.min.js
var jszip_min = __webpack_require__(710);
var jszip_min_default = /*#__PURE__*/__webpack_require__.n(jszip_min);
;// ./src/js/import-manager.js
function import_manager_slicedToArray(r, e) { return import_manager_arrayWithHoles(r) || import_manager_iterableToArrayLimit(r, e) || import_manager_unsupportedIterableToArray(r, e) || import_manager_nonIterableRest(); }
function import_manager_nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function import_manager_iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function import_manager_arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function import_manager_regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return import_manager_regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (import_manager_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, import_manager_regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, import_manager_regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), import_manager_regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", import_manager_regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), import_manager_regeneratorDefine2(u), import_manager_regeneratorDefine2(u, o, "Generator"), import_manager_regeneratorDefine2(u, n, function () { return this; }), import_manager_regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (import_manager_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function import_manager_regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } import_manager_regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { import_manager_regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, import_manager_regeneratorDefine2(e, r, n, t); }
function import_manager_toConsumableArray(r) { return import_manager_arrayWithoutHoles(r) || import_manager_iterableToArray(r) || import_manager_unsupportedIterableToArray(r) || import_manager_nonIterableSpread(); }
function import_manager_nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function import_manager_iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function import_manager_arrayWithoutHoles(r) { if (Array.isArray(r)) return import_manager_arrayLikeToArray(r); }
function import_manager_createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = import_manager_unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function import_manager_unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return import_manager_arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? import_manager_arrayLikeToArray(r, a) : void 0; } }
function import_manager_arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function import_manager_asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function import_manager_asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { import_manager_asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { import_manager_asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
/**
 * Gestionnaire d'import pour fichiers NC2 et ZIP (SANS ID)
 */


var ImportManager = {
  /**
   * Traite plusieurs fichiers NC2 ou un ZIP
   * @param {FileList} files - Liste des fichiers à traiter
   * @returns {Promise<Array>} - Tableau d'objets barre
   */
  processMultipleFiles: function () {
    var _processMultipleFiles = import_manager_asyncToGenerator(/*#__PURE__*/import_manager_regenerator().m(function _callee(files) {
      var barres, _iterator, _step, file, fileName, content, parsedData, barre, zipBarres, _t, _t2;
      return import_manager_regenerator().w(function (_context) {
        while (1) switch (_context.p = _context.n) {
          case 0:
            barres = [];
            _context.p = 1;
            _iterator = import_manager_createForOfIteratorHelper(files);
            _context.p = 2;
            _iterator.s();
          case 3:
            if ((_step = _iterator.n()).done) {
              _context.n = 8;
              break;
            }
            file = _step.value;
            fileName = file.name.toLowerCase();
            if (!(fileName.endsWith('.nc2') || fileName.endsWith('.nc1'))) {
              _context.n = 5;
              break;
            }
            _context.n = 4;
            return this.readFileAsText(file);
          case 4:
            content = _context.v;
            parsedData = Parser.parseNC2(content);
            barre = this.convertToBarre(parsedData, file.name);
            if (barre) {
              barres.push(barre);
            }
            _context.n = 7;
            break;
          case 5:
            if (!fileName.endsWith('.zip')) {
              _context.n = 7;
              break;
            }
            _context.n = 6;
            return this.processZipFile(file);
          case 6:
            zipBarres = _context.v;
            barres.push.apply(barres, import_manager_toConsumableArray(zipBarres));
          case 7:
            _context.n = 3;
            break;
          case 8:
            _context.n = 10;
            break;
          case 9:
            _context.p = 9;
            _t = _context.v;
            _iterator.e(_t);
          case 10:
            _context.p = 10;
            _iterator.f();
            return _context.f(10);
          case 11:
            return _context.a(2, barres);
          case 12:
            _context.p = 12;
            _t2 = _context.v;
            console.error('Erreur traitement fichiers:', _t2);
            throw _t2;
          case 13:
            return _context.a(2);
        }
      }, _callee, this, [[2, 9, 10, 11], [1, 12]]);
    }));
    function processMultipleFiles(_x) {
      return _processMultipleFiles.apply(this, arguments);
    }
    return processMultipleFiles;
  }(),
  /**
   * Lit un fichier comme texte
   * @param {File} file - Fichier à lire
   * @returns {Promise<string>} - Contenu du fichier
   */
  readFileAsText: function readFileAsText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        return resolve(reader.result);
      };
      reader.onerror = function (e) {
        return reject(new Error("Erreur lecture ".concat(file.name)));
      };
      reader.readAsText(file);
    });
  },
  /**
   * Vérifie si un fichier est valide (pas un fichier système macOS)
   * @param {string} path - Chemin du fichier
   * @returns {boolean} - True si le fichier est valide
   */
  isValidFile: function isValidFile(path) {
    var lowerPath = path.toLowerCase();

    // Filtrer les fichiers système macOS
    if (path.includes('__MACOSX') || path.startsWith('._')) {
      return false;
    }

    // Filtrer les fichiers cachés et système
    if (path.startsWith('.DS_Store') || path.includes('/.DS_Store')) {
      return false;
    }

    // Vérifier l'extension
    return lowerPath.endsWith('.nc2') || lowerPath.endsWith('.nc1');
  },
  /**
   * Traite un fichier ZIP contenant des fichiers NC2
   * @param {File} zipFile - Fichier ZIP à traiter
   * @returns {Promise<Array>} - Tableau d'objets barre
   */
  processZipFile: function () {
    var _processZipFile = import_manager_asyncToGenerator(/*#__PURE__*/import_manager_regenerator().m(function _callee2(zipFile) {
      var barres, arrayBuffer, zip, _i, _Object$entries, _Object$entries$_i, path, zipEntry, content, parsedData, barre, _t3;
      return import_manager_regenerator().w(function (_context2) {
        while (1) switch (_context2.p = _context2.n) {
          case 0:
            barres = [];
            _context2.p = 1;
            _context2.n = 2;
            return new Promise(function (resolve, reject) {
              var reader = new FileReader();
              reader.onload = function () {
                return resolve(reader.result);
              };
              reader.onerror = function () {
                return reject(new Error("Erreur lecture ZIP"));
              };
              reader.readAsArrayBuffer(zipFile);
            });
          case 2:
            arrayBuffer = _context2.v;
            _context2.n = 3;
            return jszip_min_default().loadAsync(arrayBuffer);
          case 3:
            zip = _context2.v;
            _i = 0, _Object$entries = Object.entries(zip.files);
          case 4:
            if (!(_i < _Object$entries.length)) {
              _context2.n = 9;
              break;
            }
            _Object$entries$_i = import_manager_slicedToArray(_Object$entries[_i], 2), path = _Object$entries$_i[0], zipEntry = _Object$entries$_i[1];
            if (!zipEntry.dir) {
              _context2.n = 5;
              break;
            }
            return _context2.a(3, 8);
          case 5:
            if (this.isValidFile(path)) {
              _context2.n = 6;
              break;
            }
            console.log("Fichier ignor\xE9: ".concat(path));
            return _context2.a(3, 8);
          case 6:
            _context2.n = 7;
            return zipEntry.async('string');
          case 7:
            content = _context2.v;
            try {
              parsedData = Parser.parseNC2(content);
              barre = this.convertToBarre(parsedData, path);
              if (barre) {
                barres.push(barre);
              }
            } catch (error) {
              console.error("Erreur parsing ".concat(path, ":"), error);
            }
          case 8:
            _i++;
            _context2.n = 4;
            break;
          case 9:
            return _context2.a(2, barres);
          case 10:
            _context2.p = 10;
            _t3 = _context2.v;
            console.error("Erreur traitement ZIP:", _t3);
            throw _t3;
          case 11:
            return _context2.a(2);
        }
      }, _callee2, this, [[1, 10]]);
    }));
    function processZipFile(_x2) {
      return _processZipFile.apply(this, arguments);
    }
    return processZipFile;
  }(),
  /**
   * Convertit les données parsées en objet barre (SANS ID)
   * @param {Object} parsedData - Données parsées du fichier NC2
   * @param {string} filename - Nom du fichier source
   * @returns {Object|null} - Objet barre ou null si invalide
   */
  convertToBarre: function convertToBarre(parsedData, filename) {
    if (!parsedData || !parsedData.profil || parsedData.profil.trim() === '') {
      console.error("Donn\xE9es invalides: ".concat(filename));
      return null;
    }
    var shortName = filename.split('/').pop();

    // Format adapté à la nouvelle structure du parser (SANS ID)
    return {
      nom: parsedData.nom || shortName.replace(/\.[^/.]+$/, ""),
      profile: parsedData.profil || 'INCONNU',
      length: parsedData.longueur || 0,
      quantity: parsedData.quantite || 1,
      orientation: parsedData.orientation || "a-plat",
      type: 'fille',
      angles: {
        1: parsedData.angle_1 || 90,
        2: parsedData.angle_2 || 90
      },
      // Propriétés F4C pour la génération F4C
      f4cData: {
        B021: parsedData.B021 || '',
        B035: parsedData.B035 || '',
        S051: parsedData.S051 || '',
        S052: parsedData.S052 || '',
        S053: parsedData.S053 || '',
        S054: parsedData.S054 || '',
        S055: parsedData.S055 || '',
        S058: parsedData.S058 || ''
      },
      // SUPPRIMÉ: Plus d'ID ni originalFile
      originalFile: shortName
    };
  }
};
;// ./src/js/ui/notification-service.js
/**
 * Service de notification
 * Gère l'affichage des notifications à l'utilisateur
 */
var NotificationService = {
  /**
   * Initialise le service de notification
   */
  init: function init() {
    this.createNotificationContainer();
  },
  /**
   * Crée le conteneur de notifications
   */
  createNotificationContainer: function createNotificationContainer() {
    var container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'notification-container';
      container.style.cssText = "\n        position: fixed;\n        top: 20px;\n        right: 20px;\n        z-index: 9999;\n        max-width: 400px;\n        pointer-events: none;\n      ";
      document.body.appendChild(container);
    }
  },
  /**
   * Obtient l'icône pour chaque type
   */
  getIcon: function getIcon(type) {
    // Pas d'icônes, retourner une chaîne vide
    return '';
  },
  /**
   * Affiche une notification
   * @param {string} message - Message à afficher
   * @param {string} type - Type de notification ('success', 'warning', 'error', 'info')
   */
  show: function show(message) {
    var _this = this;
    var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'info';
    // Créer la notification
    var notification = document.createElement('div');
    notification.className = "notification notification-".concat(type);
    notification.style.cssText = "\n      background: ".concat(this.getBackgroundColor(type), ";\n      color: ").concat(this.getTextColor(type), ";\n      border: 1px solid ").concat(this.getBorderColor(type), ";\n      border-radius: 6px;\n      padding: 12px 16px;\n      margin-bottom: 8px;\n      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);\n      pointer-events: auto;\n      opacity: 0;\n      transform: translateX(100%);\n      transition: all 0.3s ease;\n      display: flex;\n      justify-content: space-between;\n      align-items: center;\n      font-size: 14px;\n      line-height: 1.4;\n    ");

    // Ajouter le message (sans icône)
    var content = document.createElement('div');
    content.style.flex = '1';
    content.textContent = message; // Utiliser textContent au lieu de innerHTML

    // Bouton de fermeture
    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = "\n      background: none;\n      border: none;\n      color: inherit;\n      font-size: 18px;\n      cursor: pointer;\n      margin-left: 12px;\n      padding: 0;\n      line-height: 1;\n    ";
    notification.appendChild(content);
    notification.appendChild(closeBtn);

    // Ajouter au conteneur
    var container = document.getElementById('notification-container');
    container.appendChild(notification);

    // Animation d'entrée
    setTimeout(function () {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    }, 10);

    // Fermeture automatique et manuelle
    var autoRemove = setTimeout(function () {
      _this.removeNotification(notification);
    }, type === 'error' ? 6000 : 1000); // Réduit les durées

    closeBtn.addEventListener('click', function () {
      clearTimeout(autoRemove);
      _this.removeNotification(notification);
    });

    // Log console pour les erreurs
    if (type === 'error') {
      console.error(message);
    }
  },
  /**
   * Supprime une notification avec animation
   */
  removeNotification: function removeNotification(notification) {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(function () {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  },
  /**
   * Obtient la couleur de fond pour chaque type
   */
  getBackgroundColor: function getBackgroundColor(type) {
    var colors = {
      success: '#d4edda',
      warning: '#fff3cd',
      error: '#f8d7da',
      info: '#d1ecf1'
    };
    return colors[type] || colors.info;
  },
  /**
   * Obtient la couleur du texte pour chaque type
   */
  getTextColor: function getTextColor(type) {
    var colors = {
      success: '#155724',
      warning: '#856404',
      error: '#721c24',
      info: '#0c5460'
    };
    return colors[type] || colors.info;
  },
  /**
   * Obtient la couleur de bordure pour chaque type
   */
  getBorderColor: function getBorderColor(type) {
    var colors = {
      success: '#c3e6cb',
      warning: '#ffeeba',
      error: '#f5c6cb',
      info: '#bee5eb'
    };
    return colors[type] || colors.info;
  }
};
;// ./src/js/F4C-generator.js
function F4C_generator_regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return F4C_generator_regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (F4C_generator_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, F4C_generator_regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, F4C_generator_regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), F4C_generator_regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", F4C_generator_regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), F4C_generator_regeneratorDefine2(u), F4C_generator_regeneratorDefine2(u, o, "Generator"), F4C_generator_regeneratorDefine2(u, n, function () { return this; }), F4C_generator_regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (F4C_generator_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function F4C_generator_regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } F4C_generator_regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { F4C_generator_regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, F4C_generator_regeneratorDefine2(e, r, n, t); }
function F4C_generator_asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function F4C_generator_asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { F4C_generator_asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { F4C_generator_asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function F4C_generator_slicedToArray(r, e) { return F4C_generator_arrayWithHoles(r) || F4C_generator_iterableToArrayLimit(r, e) || F4C_generator_unsupportedIterableToArray(r, e) || F4C_generator_nonIterableRest(); }
function F4C_generator_nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function F4C_generator_unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return F4C_generator_arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? F4C_generator_arrayLikeToArray(r, a) : void 0; } }
function F4C_generator_arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function F4C_generator_iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function F4C_generator_arrayWithHoles(r) { if (Array.isArray(r)) return r; }
/**
 * Générateur de fichiers F4C à partir des objets F4C
 */

var F4CGenerator = {
  /**
   * MODIFIÉ: Formate une longueur en mètres avec décimales précises (POINT comme séparateur pour les noms de fichiers)
   * @param {number} lengthInMm - Longueur en centimètres
   * @param {boolean} useComma - Si true, utilise la virgule, sinon le point
   * @returns {string} - Longueur formatée en mètres
   */

  /**
   * NOUVEAU: Formate une date au format AAAA-MM-JJ_HH-mm pour les noms de fichiers
   * @param {Date} date - Date à formater
   * @returns {string} - Date formatée pour nom de fichier
   */
  formatDateTimeForFileName: function formatDateTimeForFileName(date) {
    var year = date.getFullYear();
    var month = (date.getMonth() + 1).toString().padStart(2, '0');
    var day = date.getDate().toString().padStart(2, '0');
    var hours = date.getHours().toString().padStart(2, '0');
    var minutes = date.getMinutes().toString().padStart(2, '0');
    return "".concat(year, "-").concat(month, "-").concat(day, "_").concat(hours, "-").concat(minutes);
  },
  /**
   * MODIFIÉ: Formate une date au format JJ/MM/AAAA
   * @param {Date} date - Date à formater
   * @returns {string} - Date formatée
   */
  formatDate: function formatDate(date) {
    var day = date.getDate().toString().padStart(2, '0');
    var month = (date.getMonth() + 1).toString().padStart(2, '0');
    var year = date.getFullYear();
    return "".concat(day, "/").concat(month, "/").concat(year);
  },
  /**
   * MODIFIÉ: Formate une date pour les noms de fichiers (sans slashes)
   * @param {Date} date - Date à formater
   * @returns {string} - Date formatée pour nom de fichier
   */
  formatDateForFileName: function formatDateForFileName(date) {
    var day = date.getDate().toString().padStart(2, '0');
    var month = (date.getMonth() + 1).toString().padStart(2, '0');
    var year = date.getFullYear();
    return "".concat(day, "-").concat(month, "-").concat(year);
  },
  /**
   * MODIFIÉ: Génère le nom de fichier F4C adapté au nouveau format
   * @param {Object} F4CObject - Objet F4C (nouveau format)
   * @returns {string} - Nom du fichier
   */
  generateF4CFileName: function generateF4CFileName(F4CObject) {
    var profil = F4CObject.profile;
    var longueurMm = F4CObject.length;
    var orientation = F4CObject.orientation;
    var pieces = F4CObject.pieces || [];

    // Noms des barres (toutes, sans limite)
    var nomsPieces = pieces.map(function (piece) {
      var nom = piece.nom;
      if (nom && nom.trim() !== '') {
        // Nettoyer le nom (supprimer caractères spéciaux)
        return nom.replace(/[^a-zA-Z0-9]/g, '');
      } else {
        // Utiliser le profil + longueur si pas de nom
        return "".concat(piece.profile).concat(piece.length);
      }
    });

    // Assembler le nom avec longueur précise (point décimal)
    var nomFichier = "".concat(profil, "_").concat(longueurMm, "mm_").concat(orientation, "__").concat(nomsPieces.join('-'), ".F4C");

    // Nettoyer le nom final (supprimer caractères interdits dans les noms de fichier)
    nomFichier = nomFichier.replace(/[<>:"/\\|?*]/g, '_');

    // Optionnel : tronquer à 120 caractères avant l'extension
    var maxLen = 120;
    if (nomFichier.length > maxLen + 4) {
      // 4 pour ".F4C"
      var ext = '.F4C';
      nomFichier = nomFichier.slice(0, maxLen) + ext;
    }
    return nomFichier;
  },
  /**
   * Génère un fichier F4C à partir d'un objet F4C (nouveau format)
   * @param {Object} F4CObject - Objet F4C (nouveau format)
   * @param {Object} dataManager - Instance du DataManager
   * @returns {string} - Contenu du fichier F4C
   */
  generateF4CFromObject: function generateF4CFromObject(F4CObject, dataManager) {
    var _this = this;
    console.log("\uD83D\uDD27 G\xE9n\xE9ration F4C pour ".concat(F4CObject.profile, "_").concat(F4CObject.orientation));
    try {
      // NOUVEAU FORMAT : accès direct aux propriétés
      var pieces = F4CObject.pieces || [];
      var barLength = F4CObject.length;
      if (!pieces || pieces.length === 0) {
        throw new Error('Aucune pièce à découper dans l\'objet F4C');
      }

      // Prendre les données F4C de la première pièce comme base pour le BODY
      var firstPiece = pieces[0];

      // Générer le BODY avec les données de la première pièce
      var bodyContent = this.generateBody(firstPiece, {
        profile: F4CObject.profile,
        length: barLength,
        orientation: F4CObject.orientation
      });

      // CORRIGÉ: Générer un STEP par pièce (pas de groupement)
      var stepsContent = pieces.map(function (piece) {
        return _this.generateStep(piece, 1);
      } // Toujours quantité 1 par STEP
      ).join('\n');

      // Assembler le contenu final
      var F4CContent = "<!--CEB-->\n".concat(bodyContent, "\n").concat(stepsContent);
      console.log("\u2705 F4C g\xE9n\xE9r\xE9: ".concat(pieces.length, " steps pour ").concat(pieces.length, " pi\xE8ces"));
      return F4CContent;
    } catch (error) {
      console.error("\u274C Erreur g\xE9n\xE9ration F4C ".concat(F4CObject.profile, "_").concat(F4CObject.orientation, ":"), error);
      throw error;
    }
  },
  /**
   * MODIFIÉ: Génère le contenu du BODY (adapté au nouveau format)
   * @param {Object} firstPiece - Première pièce du F4C
   * @param {Object} motherBarInfo - Informations de la barre mère
   * @returns {string} - Contenu du BODY
   */
  generateBody: function generateBody(firstPiece, motherBarInfo) {
    var f4cData = firstPiece.f4cData || {};

    // Template par défaut pour le BODY
    var bodyTemplate = {
      B001: "        ",
      B002: "700",
      B003: "3",
      B004: "0",
      B005: "0",
      B006: "0",
      B007: "0",
      B008: "0",
      B009: "0",
      B010: "0",
      B011: "0",
      B012: "0",
      B013: "0",
      B021: "1",
      // Profil ?
      B022: "0",
      B023: "0",
      B024: "0",
      B025: "0",
      B041: "0",
      B026: "0",
      B027: "0",
      B030: "        ",
      B031: "                ",
      B032: "                ",
      B033: "        ",
      B034: "0",
      B035: "1000000",
      // Sera remplacé par les données de la pièce
      B037: "                ",
      B036: "0",
      B090: "                ",
      B100: "1"
    };

    // // Appliquer les données F4C de la pièce
    // if (f4cData.B021) {
    //   bodyTemplate.B021 = f4cData.B021.padEnd(8, ' ');
    // } else {
    //   // Générer B021 à partir du profil
    //   bodyTemplate.B021 = firstPiece.profile.substring(0, 3).padEnd(8, ' ');
    // }

    if (f4cData.B035) {
      bodyTemplate.B035 = f4cData.B035;
    } else {
      // Valeur par défaut basée sur le profil
      bodyTemplate.B035 = "10000";
    }

    // Construire la chaîne BODY
    var bodyParts = [];
    for (var _i = 0, _Object$entries = Object.entries(bodyTemplate); _i < _Object$entries.length; _i++) {
      var _Object$entries$_i = F4C_generator_slicedToArray(_Object$entries[_i], 2),
        key = _Object$entries$_i[0],
        value = _Object$entries$_i[1];
      bodyParts.push("".concat(key, "=\"").concat(value, "\""));
    }
    return "<BODY ".concat(bodyParts.join(' '), " ></BODY>");
  },
  /**
   * MODIFIÉ: Génère un STEP pour une pièce (toujours quantité 1)
   * @param {Object} piece - Pièce à découper
   * @param {number} quantity - Quantité de pièces identiques (toujours 1 maintenant)
   * @returns {string} - Contenu du STEP
   */
  generateStep: function generateStep(piece) {
    var quantity = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    var f4cData = piece.f4cData || {};

    // Template par défaut pour le STEP
    var stepTemplate = {
      S051: "15000000",
      // Longueur en micromètres - sera remplacé
      S052: "1",
      // Quantité - toujours 1
      S053: "0",
      S054: "9000",
      // Angle début en centièmes - sera remplacé
      S055: "9000",
      // Angle fin en centièmes - sera remplacé
      S056: "1",
      S057: "1",
      S058: "1",
      S060: "0",
      S061: "0",
      S070: "0",
      S071: "0",
      S072: "0",
      S073: "0",
      S074: "0",
      S075: "0",
      S094: "0"
    };

    // Appliquer les données F4C de la pièce
    stepTemplate.S051 = f4cData.S051;

    // Angles
    stepTemplate.S054 = f4cData.S054;
    stepTemplate.S055 = f4cData.S055;

    // Gestion de S058
    stepTemplate.S058 = f4cData.S058;

    // Construire la chaîne STEP
    var stepParts = [];
    for (var _i2 = 0, _Object$entries2 = Object.entries(stepTemplate); _i2 < _Object$entries2.length; _i2++) {
      var _Object$entries2$_i = F4C_generator_slicedToArray(_Object$entries2[_i2], 2),
        key = _Object$entries2$_i[0],
        value = _Object$entries2$_i[1];
      stepParts.push("".concat(key, "=\"").concat(value, "\""));
    }
    return "<STEP ".concat(stepParts.join(' '), " ></STEP>");
  },
  /**
   * CORRIGÉ: Génère le nom du fichier ZIP au format demandé
   * @param {Array} F4CObjects - Liste des objets F4C
   * @returns {string} - Nom du fichier ZIP
   */
  generateZipFileName: function generateZipFileName(F4CObjects) {
    // Date au format AAAA-MM-JJ_HH-mm
    var now = new Date();
    var dateStr = this.formatDateTimeForFileName(now);

    // Compter le nombre total de barres uniques
    var barNames = new Set();
    F4CObjects.forEach(function (F4C) {
      F4C.pieces.forEach(function (piece) {
        // Correction : fallback si pieceReference absent
        var barName = '';
        if (piece.pieceReference && piece.pieceReference.nom && piece.pieceReference.nom.trim() !== '') {
          barName = piece.pieceReference.nom.trim();
        } else if (piece.nom && piece.nom.trim() !== '') {
          barName = piece.nom.trim();
        } else if (piece.profile && piece.length) {
          barName = "".concat(piece.profile, "_").concat(piece.length, " mm");
        } else {
          barName = 'barre_inconnue';
        }
        barNames.add(barName);
      });
    });
    var nombreBarres = barNames.size;

    // MODIFIÉ: Format final avec nombre de barres avant la date
    var fileName = "lot_F4C_".concat(nombreBarres, "_barres_").concat(dateStr, ".zip");

    // Nettoyer le nom final (supprimer caractères interdits dans les noms de fichier)
    return fileName.replace(/[<>:"/\\|?*]/g, '_');
  },
  /**
   * MODIFIÉ: Génère un ZIP avec tous les fichiers F4C à partir des objets F4C
   * @param {Array} F4CObjects - Liste des objets F4C
   * @param {Object} dataManager - Instance du DataManager
   * @returns {Promise<{blob: Blob, fileName: string}>} - Blob et nom du fichier ZIP
   */
  generateAllF4CFromObjects: function () {
    var _generateAllF4CFromObjects = F4C_generator_asyncToGenerator(/*#__PURE__*/F4C_generator_regenerator().m(function _callee(F4CObjects, dataManager) {
      var zip, fileNames, i, F4CObject, F4CContent, fileName, counter, uniqueFileName, nameParts, errorFileName, errorContent, summary, zipFileName, blob, _t;
      return F4C_generator_regenerator().w(function (_context) {
        while (1) switch (_context.p = _context.n) {
          case 0:
            console.log("\uD83C\uDFD7\uFE0F G\xE9n\xE9ration de ".concat(F4CObjects.length, " fichiers F4C..."));
            if (!(!F4CObjects || F4CObjects.length === 0)) {
              _context.n = 1;
              break;
            }
            throw new Error('Aucun objet F4C fourni');
          case 1:
            zip = new (jszip_min_default())();
            fileNames = new Set(); // Pour éviter les doublons
            _context.p = 2;
            // Générer chaque fichier F4C
            for (i = 0; i < F4CObjects.length; i++) {
              F4CObject = F4CObjects[i];
              try {
                // Générer le contenu F4C
                F4CContent = this.generateF4CFromObject(F4CObject, dataManager); // Générer le nom de fichier
                fileName = this.generateF4CFileName(F4CObject); // Gérer les doublons en ajoutant un numéro
                counter = 1;
                uniqueFileName = fileName;
                while (fileNames.has(uniqueFileName)) {
                  nameParts = fileName.split('.F4C');
                  uniqueFileName = "".concat(nameParts[0], "_").concat(counter, ".F4C");
                  counter++;
                }
                fileNames.add(uniqueFileName);

                // Ajouter au ZIP
                zip.file(uniqueFileName, F4CContent);
                console.log("  \u2705 ".concat(uniqueFileName, " (").concat(F4CObject.pieces.length, " pi\xE8ces)"));
              } catch (error) {
                console.error("\u274C Erreur g\xE9n\xE9ration F4C ".concat(i + 1, ":"), error);

                // Créer un fichier d'erreur pour continuer le processus
                errorFileName = "ERREUR_F4C_".concat(i + 1, ".txt");
                errorContent = "Erreur lors de la g\xE9n\xE9ration du F4C:\n".concat(error.message, "\n\nObjet F4C:\n").concat(JSON.stringify(F4CObject, null, 2));
                zip.file(errorFileName, errorContent);
              }
            }

            // Ajouter un fichier de résumé
            summary = this.generateSummaryFile(F4CObjects);
            zip.file('RESUME_GENERATION.txt', summary);

            // Générer le nom du fichier ZIP
            zipFileName = this.generateZipFileName(F4CObjects); // Générer le ZIP
            console.log('📦 Création du fichier ZIP...');
            _context.n = 3;
            return zip.generateAsync({
              type: "blob",
              compression: "DEFLATE",
              compressionOptions: {
                level: 6
              }
            });
          case 3:
            blob = _context.v;
            console.log("\u2705 ZIP g\xE9n\xE9r\xE9 avec succ\xE8s: ".concat(zipFileName, " (").concat(fileNames.size, " fichiers F4C)"));

            // Retourner le blob et le nom du fichier
            return _context.a(2, {
              blob: blob,
              fileName: zipFileName
            });
          case 4:
            _context.p = 4;
            _t = _context.v;
            console.error('❌ Erreur lors de la génération du ZIP:', _t);
            throw _t;
          case 5:
            return _context.a(2);
        }
      }, _callee, this, [[2, 4]]);
    }));
    function generateAllF4CFromObjects(_x, _x2) {
      return _generateAllF4CFromObjects.apply(this, arguments);
    }
    return generateAllF4CFromObjects;
  }(),
  /**
   * MODIFIÉ: Génère un fichier de résumé pour le ZIP avec virgules décimales et format de date français
   * @param {Array} F4CObjects - Liste des objets F4C
   * @returns {string} - Contenu du fichier de résumé
   */
  generateSummaryFile: function generateSummaryFile(F4CObjects) {
    var _this2 = this;
    var now = new Date();
    var dateStr = this.formatDate(now);
    var timeStr = now.toLocaleTimeString('fr-FR');
    var summary = "R\xC9SUM\xC9 DE G\xC9N\xC9RATION F4C\n";
    summary += "========================\n\n";
    summary += "Date de g\xE9n\xE9ration: ".concat(dateStr, " \xE0 ").concat(timeStr, "\n");
    summary += "Nombre total de fichiers F4C: ".concat(F4CObjects.length, "\n\n");

    // Statistiques par profil
    var profileStats = {};
    F4CObjects.forEach(function (F4C) {
      var profile = F4C.profile;
      if (!profileStats[profile]) {
        profileStats[profile] = {
          count: 0,
          totalPieces: 0,
          totalLength: 0,
          totalWaste: 0
        };
      }
      profileStats[profile].count++;
      profileStats[profile].totalPieces += F4C.pieces.length;
      profileStats[profile].totalLength += F4C.length;
      // Si tu as la chute sur le F4C, ajoute-la ici
      if (typeof F4C.waste === 'number') {
        profileStats[profile].totalWaste += F4C.waste;
      } else {
        // Sinon, calcule-la
        var totalPiecesLength = F4C.pieces.reduce(function (sum, piece) {
          return sum + piece.length;
        }, 0);
        profileStats[profile].totalWaste += F4C.length - totalPiecesLength;
      }
    });
    summary += "STATISTIQUES PAR PROFIL:\n";
    summary += "------------------------\n";
    for (var _i3 = 0, _Object$entries3 = Object.entries(profileStats); _i3 < _Object$entries3.length; _i3++) {
      var _Object$entries3$_i = F4C_generator_slicedToArray(_Object$entries3[_i3], 2),
        profile = _Object$entries3$_i[0],
        stats = _Object$entries3$_i[1];
      var efficiency = Math.round((1 - stats.totalWaste / stats.totalLength) * 100);
      var totalWasteCm = Math.round(stats.totalWaste);
      summary += "".concat(profile, ":\n");
      summary += "  - ".concat(stats.count, " barres m\xE8res\n");
      summary += "  - ".concat(stats.totalPieces, " pi\xE8ces \xE0 d\xE9couper\n");
      summary += "  - ".concat(stats.totalLength, " mm de barres\n");
      summary += "  - ".concat(totalWasteCm, " mm de chutes\n");
      summary += "  - Efficacit\xE9: ".concat(efficiency, "%\n\n");
    }

    // DÉTAIL DES BARRES À DÉCOUPER PAR F4C
    summary += "D\xC9TAIL DES BARRES \xC0 D\xC9COUPER:\n";
    summary += "=============================\n\n";
    F4CObjects.forEach(function (F4C, F4CIndex) {
      var fileName = _this2.generateF4CFileName(F4C);
      summary += "\u2554".concat('═'.repeat(80), "\n");
      summary += "\u2551 F4C ".concat(F4CIndex + 1, ": ").concat(fileName, "\n");
      summary += "\u255A".concat('═'.repeat(80), "\n\n");
      var totalPiecesLength = F4C.pieces.reduce(function (sum, piece) {
        return sum + piece.length;
      }, 0);
      var waste = F4C.length - totalPiecesLength;
      summary += "Profil: ".concat(F4C.profile, "\n");
      summary += "Orientation: ".concat(F4C.orientation, "\n");
      summary += "Longueur: ".concat(F4C.length, " mm\n");
      summary += "Chute: ".concat(waste, " mm\n");

      // Efficacité
      var efficiency = F4C.length > 0 ? Math.round(totalPiecesLength / F4C.length * 100) : 0;
      summary += "Efficacit\xE9: ".concat(efficiency, "%\n\n");
      summary += "Barres \xE0 d\xE9couper:\n";
      summary += "".concat('─'.repeat(50), "\n");
      if (F4C.pieces && F4C.pieces.length > 0) {
        F4C.pieces.forEach(function (piece, pieceIndex) {
          var _piece$angles, _piece$angles2;
          var pieceName = piece.nom && piece.nom.trim() !== '' ? piece.nom : "".concat(piece.profile, "_").concat(piece.length, " mm");
          var angle1 = ((_piece$angles = piece.angles) === null || _piece$angles === void 0 ? void 0 : _piece$angles[1]) || 90;
          var angle2 = ((_piece$angles2 = piece.angles) === null || _piece$angles2 === void 0 ? void 0 : _piece$angles2[2]) || 90;
          var angleInfo = angle1 !== 90 || angle2 !== 90 ? " - Angles: ".concat(angle1, "\xB0/").concat(angle2, "\xB0") : '';
          summary += "  ".concat((pieceIndex + 1).toString().padStart(2, ' '), ". ").concat(pieceName, " - ").concat(piece.length, " mm").concat(angleInfo, "\n");
        });
      } else {
        summary += "  Aucune pi\xE8ce \xE0 d\xE9couper\n";
      }
      summary += "\n\n";
    });
    return summary;
  }
};
;// ./src/js/ui/results-handler.js
function results_handler_regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return results_handler_regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (results_handler_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, results_handler_regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, results_handler_regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), results_handler_regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", results_handler_regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), results_handler_regeneratorDefine2(u), results_handler_regeneratorDefine2(u, o, "Generator"), results_handler_regeneratorDefine2(u, n, function () { return this; }), results_handler_regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (results_handler_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function results_handler_regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } results_handler_regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { results_handler_regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, results_handler_regeneratorDefine2(e, r, n, t); }
function results_handler_asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function results_handler_asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { results_handler_asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { results_handler_asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
/**
 * Gestionnaire de la section résultats
 * Gère le rendu des résultats et la génération des fichiers F4C
 */



var ResultsHandler = {
  // Dépendances
  F4CGenerator: null,
  dataManager: null,
  uiController: null,
  // Callbacks
  showNotification: null,
  // État pour gérer les modals
  currentModal: null,
  /**
   * Initialise le gestionnaire de résultats
   */
  init: function init(options) {
    this.F4CGenerator = options.F4CGenerator;
    this.dataManager = options.dataManager;
    this.uiController = options.uiController;
    this.showNotification = options.showNotification;
  },
  /**
   * Génère les aperçus des fichiers F4C à partir des objets F4C
   */
  generateF4CPreviews: function generateF4CPreviews() {
    var _this = this;
    try {
      var container = document.getElementById('F4C-files-list');
      if (!container) {
        console.warn('Container F4C-files-list non trouvé');
        return;
      }
      var F4CObjects = this.uiController.getCurrentF4CObjects();
      if (!F4CObjects || F4CObjects.length === 0) {
        container.innerHTML = '<p class="info-text">Aucun fichier F4C à générer.</p>';
        return;
      }

      // Filtrer les objets F4C valides
      var validF4CObjects = F4CObjects.filter(function (F4CObject) {
        if (!F4CObject) {
          console.warn('Objet F4C undefined trouvé');
          return false;
        }
        if (!F4CObject.profile) {
          console.warn('Objet F4C sans profile:', F4CObject);
          return false;
        }
        return true;
      });
      if (validF4CObjects.length === 0) {
        container.innerHTML = '<p class="error-text">Aucun objet F4C valide trouvé.</p>';
        return;
      }
      var html = "<div class=\"F4C-preview-header\">\n        <h3>Fichiers F4C \xE0 g\xE9n\xE9rer</h3>\n        <button id=\"download-all-F4C-btn\" class=\"btn btn-primary\">\n          <img src=\"assets/download.svg\" alt=\"\" class=\"btn-icon\">\n          T\xE9l\xE9charger tous les F4C (ZIP)\n        </button>\n      </div>";

      // Générer l'aperçu pour chaque objet F4C valide
      validF4CObjects.forEach(function (F4CObject, index) {
        try {
          var fileName = _this.F4CGenerator.generateF4CFileName(F4CObject);
          html += "\n            <div class=\"F4C-file-item\" data-F4C-index=\"".concat(index, "\">\n              <div class=\"F4C-file-header\">\n                <span class=\"F4C-file-name\">").concat(fileName, "</span>\n                <div class=\"F4C-file-actions\">\n                  <button class=\"btn btn-sm btn-outline info-F4C-btn\" \n                          data-F4C-index=\"").concat(index, "\">\n                    <img src=\"assets/info.svg\" alt=\"\" class=\"btn-icon\">\n                    D\xE9tails\n                  </button>\n                  <button class=\"btn btn-sm btn-primary download-F4C-btn\" \n                          data-F4C-index=\"").concat(index, "\">\n                    <img src=\"assets/download.svg\" alt=\"\" class=\"btn-icon\">\n                    T\xE9l\xE9charger\n                  </button>\n                </div>\n              </div>\n            </div>\n          ");
        } catch (error) {
          console.error('Erreur lors de la génération du nom de fichier F4C:', error, F4CObject);
          html += "\n            <div class=\"F4C-file-item error\">\n              <div class=\"F4C-file-header\">\n                <span class=\"F4C-file-name\">Erreur - F4C ".concat(index + 1, "</span>\n                <div class=\"F4C-file-actions\">\n                  <span class=\"error-text\">Erreur</span>\n                </div>\n              </div>\n            </div>\n          ");
        }
      });
      container.innerHTML = html;

      // Configurer les événements
      this.setupF4CPreviewEvents();
      console.log("".concat(validF4CObjects.length, " aper\xE7us F4C g\xE9n\xE9r\xE9s"));
    } catch (error) {
      console.error('Erreur lors de la génération des aperçus F4C:', error);
      var _container = document.getElementById('F4C-files-list');
      if (_container) {
        _container.innerHTML = '<p class="error-text">Erreur lors de la génération des aperçus F4C.</p>';
      }
    }
  },
  /**
   * Configure les événements pour les aperçus F4C
   */
  setupF4CPreviewEvents: function setupF4CPreviewEvents() {
    var _this2 = this;
    // Bouton télécharger tout
    var downloadAllBtn = document.getElementById('download-all-F4C-btn');
    if (downloadAllBtn) {
      downloadAllBtn.addEventListener('click', function () {
        _this2.downloadAllF4C();
      });
    }

    // Boutons de téléchargement individuel
    document.querySelectorAll('.download-F4C-btn').forEach(function (button) {
      button.addEventListener('click', function (e) {
        var F4CIndex = parseInt(e.target.getAttribute('data-F4C-index'), 10);
        _this2.downloadSingleF4C(F4CIndex);
      });
    });

    // Boutons d'informations
    document.querySelectorAll('.info-F4C-btn').forEach(function (button) {
      button.addEventListener('click', function (e) {
        var F4CIndex = parseInt(e.target.getAttribute('data-F4C-index'), 10);
        _this2.showF4CInfo(F4CIndex);
      });
    });
  },
  /**
   * MODIFIÉ: Télécharge un fichier F4C individuel avec overlay de chargement
   */
  downloadSingleF4C: function downloadSingleF4C(F4CIndex) {
    try {
      // NOUVEAU: Afficher l'overlay de téléchargement
      UIUtils.showSimpleLoadingOverlay('Préparation du téléchargement...');
      var F4CObjects = this.uiController.getCurrentF4CObjects();
      if (!F4CObjects || !F4CObjects[F4CIndex]) {
        UIUtils.hideSimpleLoadingOverlay();
        this.showNotification('Objet F4C introuvable', 'error');
        return;
      }
      var F4CObject = F4CObjects[F4CIndex];
      var F4CContent = this.F4CGenerator.generateF4CFromObject(F4CObject, this.dataManager);
      var fileName = this.F4CGenerator.generateF4CFileName(F4CObject);

      // Utiliser setTimeout pour permettre à l'overlay de s'afficher avant le téléchargement
      setTimeout(function () {
        UIUtils.downloadFile(F4CContent, fileName, 'text/plain');

        // Masquer l'overlay après un court délai pour laisser le temps au popup de s'afficher
        setTimeout(function () {
          UIUtils.hideSimpleLoadingOverlay();
        }, 500);
      }, 100);
    } catch (error) {
      UIUtils.hideSimpleLoadingOverlay();
      console.error('Erreur lors du téléchargement F4C:', error);
      this.showNotification("Erreur lors du t\xE9l\xE9chargement: ".concat(error.message), 'error');
    }
  },
  /**
   * Affiche les informations détaillées du F4C
   */
  showF4CInfo: function showF4CInfo(F4CIndex) {
    try {
      // Fermer le modal existant s'il y en a un
      this.closeF4CInfoModal();
      var F4CObjects = this.uiController.getCurrentF4CObjects();
      if (!F4CObjects || !F4CObjects[F4CIndex]) {
        this.showNotification('Objet F4C introuvable', 'error');
        return;
      }
      var F4CObject = F4CObjects[F4CIndex];
      var fileName = this.F4CGenerator.generateF4CFileName(F4CObject);
      this.showF4CInfoModal(fileName, F4CObject);
    } catch (error) {
      console.error('Erreur lors de l\'affichage des infos F4C:', error);
      this.showNotification("Erreur lors de l'affichage: ".concat(error.message), 'error');
    }
  },
  /**
   * Ferme le modal F4C s'il existe
   */
  closeF4CInfoModal: function closeF4CInfoModal() {
    if (this.currentModal && this.currentModal.parentNode) {
      this.currentModal.parentNode.removeChild(this.currentModal);
      this.currentModal = null;
    }

    // Nettoyer tous les modals F4C existants (au cas où)
    var existingModals = document.querySelectorAll('.F4C-info-modal');
    existingModals.forEach(function (modal) {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    });
  },
  /**
   * Formate l'orientation pour l'affichage
   */
  formatOrientation: function formatOrientation(orientation) {
    switch (orientation) {
      case 'a-plat':
        return 'À plat';
      case 'debout':
        return 'Debout';
      default:
        return orientation;
    }
  },
  /**
   * Affiche une modal avec les informations du F4C
   */
  showF4CInfoModal: function showF4CInfoModal(fileName, F4CObject) {
    var _this3 = this;
    // Adapter au nouveau format F4C
    var profile = F4CObject.profile;
    var orientation = F4CObject.orientation;
    var length = F4CObject.length;
    var pieces = F4CObject.pieces || [];
    var b021 = '1'; // Valeur par défaut pour B021
    var b035 = F4CObject.B035 || '0';

    // Calculer la chute et l'efficacité
    var totalPiecesLength = pieces.reduce(function (sum, piece) {
      return sum + piece.length;
    }, 0);
    var waste = length - totalPiecesLength;
    var efficiency = length > 0 ? (totalPiecesLength / length * 100).toFixed(1) : 0;

    // Créer la modal en utilisant les classes existantes
    var modal = document.createElement('div');
    modal.className = 'modal F4C-info-modal';
    modal.innerHTML = "\n      <div class=\"modal-content F4C-modal-content\">\n        <div class=\"modal-header\">\n          <h3>D\xE9tails du F4C: ".concat(fileName, "</h3>\n          <button class=\"close-modal\" title=\"Fermer\">&times;</button>\n        </div>\n        \n        <div class=\"modal-body F4C-modal-body\">\n          <!-- En-t\xEAte simplifi\xE9 -->\n          <div class=\"F4C-header-grid\">\n            <div class=\"F4C-header-item\">\n              <div class=\"F4C-header-label\">Profil</div>\n              <div class=\"F4C-header-value\">").concat(profile, "</div>\n            </div>\n            <div class=\"F4C-header-item\">\n              <div class=\"F4C-header-label\">Orientation</div>\n              <div class=\"F4C-header-value\">").concat(this.formatOrientation(orientation), "</div>\n            </div>\n            <div class=\"F4C-header-item\">\n              <div class=\"F4C-header-label\">Longueur</div>\n              <div class=\"F4C-header-value\">").concat(UIUtils.formatLenght(length), " mm</div>\n            </div>\n          </div>\n          \n          <!-- Informations de performance -->\n          <div class=\"F4C-performance-info\">\n            <span class=\"F4C-performance-item\">\n              Chute&nbsp;: <span class=\"F4C-performance-value\">").concat(UIUtils.formatLenght(waste), " mm</span>\n            </span>\n            <span class=\"F4C-performance-item\">\n              Efficacit\xE9&nbsp;: <span class=\"F4C-performance-value\">").concat(efficiency, "%</span>\n            </span>\n          </div>\n          \n          <!-- Param\xE8tres BODY -->\n          <div class=\"F4C-section\">\n            <h4 class=\"F4C-section-title\">Param\xE8tres BODY:</h4>\n            <div class=\"F4C-params-grid\">\n              <span class=\"F4C-param-tag\">B021: ").concat(b021, "</span>\n              <span class=\"F4C-param-tag\">B035: ").concat(b035, "</span>\n            </div>\n          </div>\n          \n          <!-- Barres \xE0 d\xE9couper -->\n          <div class=\"F4C-section\">\n            <h4 class=\"F4C-section-title\">Barres \xE0 d\xE9couper (").concat(pieces.length, "):</h4>\n            \n            <div class=\"F4C-pieces-list\">\n              ").concat(pieces.map(function (piece, index) {
      // Accès direct aux propriétés de la pièce
      var f4c = piece.f4cData || {};

      // Calculer les valeurs F4C
      var s051 = f4c.S051 || Math.round(piece.length * 10000).toString();
      var s052 = '1'; // Quantité toujours 1
      var s053 = '0'; // Quantité toujours 0
      var s054 = f4c.S054 || (piece.angles && piece.angles[1] ? Math.round(piece.angles[1] * 100).toString() : '9000');
      var s055 = f4c.S055 || (piece.angles && piece.angles[2] ? Math.round(piece.angles[2] * 100).toString() : '9000');
      var s058 = f4c.S058 || piece.S058 || '';
      return "\n                  <div class=\"F4C-piece-item\">\n                    <!-- Index align\xE9 \xE0 droite -->\n                    <div class=\"F4C-piece-index\">#".concat(index + 1, "</div>\n                    \n                    <!-- Nom de la pi\xE8ce -->\n                    <div class=\"F4C-piece-name\">\n                      ").concat(piece.nom || "Pi\xE8ce ".concat(index + 1, " - ").concat(UIUtils.formatLenght(piece.length), "mm"), "\n                    </div>\n                    \n                    <!-- Codes F4C -->\n                    <div class=\"F4C-f4c-grid\">\n                      <span class=\"F4C-f4c-tag\">S051: ").concat(s051, "</span>\n                      <span class=\"F4C-f4c-tag\">S052: ").concat(s052, "</span>\n                      <span class=\"F4C-f4c-tag\">S053: ").concat(s053, "</span>\n                      <span class=\"F4C-f4c-tag\">S054: ").concat(s054, "</span>\n                      <span class=\"F4C-f4c-tag\">S055: ").concat(s055, "</span>\n                      <span class=\"F4C-f4c-tag\">S058: ").concat(s058, "</span>\n                    </div>\n                  </div>\n                ");
    }).join(''), "\n            </div>\n          </div>\n        </div>\n        \n        <div class=\"modal-footer\">\n          <button class=\"btn btn-secondary close-modal\">Fermer</button>\n          <button class=\"btn btn-primary modal-download\">\n            <img src=\"assets/download.svg\" alt=\"\" class=\"btn-icon\">\n            T\xE9l\xE9charger\n          </button>\n        </div>\n      </div>\n    ");

    // Stocker la référence du modal
    this.currentModal = modal;

    // Ajouter au DOM
    document.body.appendChild(modal);

    // Gérer les événements de fermeture
    modal.querySelectorAll('.close-modal').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _this3.closeF4CInfoModal();
      });
    });

    // Fermer en cliquant sur l'overlay (background du modal)
    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        _this3.closeF4CInfoModal();
      }
    });

    // Fermer avec la touche Escape
    var _handleEscape = function handleEscape(e) {
      if (e.key === 'Escape') {
        _this3.closeF4CInfoModal();
        document.removeEventListener('keydown', _handleEscape);
      }
    };
    document.addEventListener('keydown', _handleEscape);

    // MODIFIÉ: Bouton de téléchargement avec overlay
    modal.querySelector('.modal-download').addEventListener('click', function () {
      try {
        // NOUVEAU: Afficher l'overlay de téléchargement
        UIUtils.showSimpleLoadingOverlay('Préparation du téléchargement...');

        // Utiliser setTimeout pour permettre à l'overlay de s'afficher
        setTimeout(function () {
          var F4CContent = _this3.F4CGenerator.generateF4CFromObject(F4CObject, _this3.dataManager);
          UIUtils.downloadFile(F4CContent, fileName, 'text/plain');

          // Fermer le modal et masquer l'overlay après un délai
          setTimeout(function () {
            _this3.closeF4CInfoModal();
            UIUtils.hideSimpleLoadingOverlay();
          }, 500);
        }, 100);
      } catch (error) {
        UIUtils.hideSimpleLoadingOverlay();
        console.error('Erreur téléchargement:', error);
        _this3.showNotification('Erreur lors du téléchargement', 'error');
      }
    });
  },
  /**
   * MODIFIÉ: Télécharge tous les fichiers F4C dans un ZIP avec overlay de chargement
   */
  downloadAllF4C: function () {
    var _downloadAllF4C = results_handler_asyncToGenerator(/*#__PURE__*/results_handler_regenerator().m(function _callee2() {
      var _this4 = this;
      var _t2;
      return results_handler_regenerator().w(function (_context2) {
        while (1) switch (_context2.p = _context2.n) {
          case 0:
            _context2.p = 0;
            console.log('🔽 Début du téléchargement des F4C...');
            if (this.uiController.currentF4CObjects) {
              _context2.n = 1;
              break;
            }
            throw new Error('Aucun objet F4C disponible');
          case 1:
            // NOUVEAU: Afficher l'overlay de téléchargement
            UIUtils.showSimpleLoadingOverlay('Génération du fichier ZIP...');

            // Utiliser setTimeout pour permettre à l'overlay de s'afficher
            setTimeout(/*#__PURE__*/results_handler_asyncToGenerator(/*#__PURE__*/results_handler_regenerator().m(function _callee() {
              var result, _t;
              return results_handler_regenerator().w(function (_context) {
                while (1) switch (_context.p = _context.n) {
                  case 0:
                    _context.p = 0;
                    _context.n = 1;
                    return F4CGenerator.generateAllF4CFromObjects(_this4.uiController.currentF4CObjects, _this4.uiController.dataManager);
                  case 1:
                    result = _context.v;
                    // CORRECTION: Vérifier que result a la bonne structure
                    console.log("\uD83D\uDCE6 Nom du ZIP g\xE9n\xE9r\xE9: ".concat(result.fileName));

                    // Télécharger avec le nom automatiquement généré
                    UIUtils.downloadFile(result.blob, result.fileName, 'application/zip');

                    // Masquer l'overlay après un délai pour laisser le temps au popup de s'afficher
                    setTimeout(function () {
                      UIUtils.hideSimpleLoadingOverlay();
                    }, 1000); // Délai plus long pour le ZIP car il peut être plus lourd
                    _context.n = 3;
                    break;
                  case 2:
                    _context.p = 2;
                    _t = _context.v;
                    UIUtils.hideSimpleLoadingOverlay();
                    console.error('❌ Erreur téléchargement F4C:', _t);

                    // CORRECTION: Utiliser this.showNotification ou NotificationService
                    if (_this4.showNotification) {
                      _this4.showNotification("\u274C Erreur: ".concat(_t.message), 'error');
                    } else {
                      NotificationService.show("\u274C Erreur: ".concat(_t.message), 'error');
                    }
                  case 3:
                    return _context.a(2);
                }
              }, _callee, null, [[0, 2]]);
            })), 100);
            _context2.n = 3;
            break;
          case 2:
            _context2.p = 2;
            _t2 = _context2.v;
            UIUtils.hideSimpleLoadingOverlay();
            console.error('❌ Erreur téléchargement F4C:', _t2);

            // CORRECTION: Utiliser this.showNotification ou NotificationService
            if (this.showNotification) {
              this.showNotification("\u274C Erreur: ".concat(_t2.message), 'error');
            } else {
              NotificationService.show("\u274C Erreur: ".concat(_t2.message), 'error');
            }
          case 3:
            return _context2.a(2);
        }
      }, _callee2, this, [[0, 2]]);
    }));
    function downloadAllF4C() {
      return _downloadAllF4C.apply(this, arguments);
    }
    return downloadAllF4C;
  }()
};
;// ./src/js/algorithm-service.js
function algorithm_service_typeof(o) { "@babel/helpers - typeof"; return algorithm_service_typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, algorithm_service_typeof(o); }
function algorithm_service_toConsumableArray(r) { return algorithm_service_arrayWithoutHoles(r) || algorithm_service_iterableToArray(r) || algorithm_service_unsupportedIterableToArray(r) || algorithm_service_nonIterableSpread(); }
function algorithm_service_nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function algorithm_service_iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function algorithm_service_arrayWithoutHoles(r) { if (Array.isArray(r)) return algorithm_service_arrayLikeToArray(r); }
function algorithm_service_ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function algorithm_service_objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? algorithm_service_ownKeys(Object(t), !0).forEach(function (r) { algorithm_service_defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : algorithm_service_ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function algorithm_service_defineProperty(e, r, t) { return (r = algorithm_service_toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function algorithm_service_toPropertyKey(t) { var i = algorithm_service_toPrimitive(t, "string"); return "symbol" == algorithm_service_typeof(i) ? i : i + ""; }
function algorithm_service_toPrimitive(t, r) { if ("object" != algorithm_service_typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != algorithm_service_typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function algorithm_service_slicedToArray(r, e) { return algorithm_service_arrayWithHoles(r) || algorithm_service_iterableToArrayLimit(r, e) || algorithm_service_unsupportedIterableToArray(r, e) || algorithm_service_nonIterableRest(); }
function algorithm_service_nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function algorithm_service_iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function algorithm_service_arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function algorithm_service_createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = algorithm_service_unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function algorithm_service_unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return algorithm_service_arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? algorithm_service_arrayLikeToArray(r, a) : void 0; } }
function algorithm_service_arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }

 // Import direct

var AlgorithmService = {
  /**
   * FONCTION PRINCIPALE SIMPLIFIÉE - Point d'entrée unique
   * Lance l'optimisation complète sans paramètres
   */
  runOptimization: function runOptimization() {
    console.log('🚀 Début de l\'optimisation complète');
    try {
      // 1. Créer les modèles à partir du DataManager
      var models = this.createModelsFromDataManager();
      if (models.length === 0) {
        throw new Error('Aucun modèle trouvé pour l\'optimisation');
      }

      // 2. Exécuter tous les algorithmes sur tous les modèles
      var allResults = this.runAllAlgorithmsOnAllModels(models);

      // 3. Traiter et comparer les résultats
      var finalResults = this.processAndCompareResults(allResults, models);
      console.log('✅ Optimisation complète terminée');
      return finalResults;
    } catch (error) {
      console.error('❌ Erreur lors de l\'optimisation:', error);
      throw error;
    }
  },
  /**
   * ÉTAPE 1: Crée les objets modèles à partir du DataManager
   */
  createModelsFromDataManager: function createModelsFromDataManager() {
    console.log('📋 Création des modèles à partir du DataManager');

    // Obtenir tous les modèles distincts directement depuis DataManager
    var modelDefinitions = DataManager.getModels();
    var models = [];
    var _iterator = algorithm_service_createForOfIteratorHelper(modelDefinitions),
      _step;
    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var modelDef = _step.value;
        var profile = modelDef.profile,
          orientation = modelDef.orientation;

        // Obtenir les barres mères pour ce profil
        var motherBars = DataManager.getMotherBarsByProfile(profile);

        // Obtenir les pièces à découper pour ce modèle
        var pieces = DataManager.getLengthsToCutByModel(profile, orientation);

        // Vérifier que le modèle a des données valides
        if (motherBars.length > 0 && pieces.length > 0) {
          var model = {
            key: "".concat(profile, "_").concat(orientation),
            profile: profile,
            orientation: orientation,
            motherBars: motherBars,
            pieces: pieces,
            label: this.formatModelLabel(profile, orientation)
          };
          models.push(model);

          // Log des détails du modèle
          var totalPieces = pieces.reduce(function (sum, p) {
            return sum + p.quantity;
          }, 0);
          var totalMotherBars = motherBars.reduce(function (sum, m) {
            return sum + m.quantity;
          }, 0);
          console.log("  \u2713 ".concat(model.label, ": ").concat(totalPieces, " pi\xE8ces, ").concat(totalMotherBars, " barres m\xE8res"));
        } else {
          console.warn("  \u26A0\uFE0F Mod\xE8le ".concat(profile, "_").concat(orientation, " ignor\xE9: donn\xE9es insuffisantes"));
        }
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
    console.log("\uD83D\uDCCA ".concat(models.length, " mod\xE8les cr\xE9\xE9s pour l'optimisation"));
    return models;
  },
  /**
   * ÉTAPE 2: Exécute tous les algorithmes sur tous les modèles
   */
  runAllAlgorithmsOnAllModels: function runAllAlgorithmsOnAllModels(models) {
    console.log('🔧 Exécution de tous les algorithmes sur tous les modèles');
    var algorithmTypes = ['ffd', 'ilp'];
    var allResults = {};

    // Boucle imbriquée: pour chaque modèle, exécuter chaque algorithme
    var _iterator2 = algorithm_service_createForOfIteratorHelper(models),
      _step2;
    try {
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
        var model = _step2.value;
        console.log("\n\uD83C\uDFAF Traitement du mod\xE8le: ".concat(model.label));
        allResults[model.key] = {
          model: model,
          algorithmResults: {}
        };
        var _iterator3 = algorithm_service_createForOfIteratorHelper(algorithmTypes),
          _step3;
        try {
          for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
            var algorithmType = _step3.value;
            console.log("  \uD83D\uDD04 Ex\xE9cution ".concat(algorithmType.toUpperCase(), " pour ").concat(model.label));
            try {
              // Appeler l'algorithme pur
              var algorithmResult = this.callPureAlgorithm(algorithmType, model.motherBars, model.pieces);

              // Convertir en format standardisé
              var standardResult = this.convertToStandardFormat(algorithmResult, model.key, algorithmType, model.pieces, model.motherBars);
              allResults[model.key].algorithmResults[algorithmType] = standardResult;
              console.log("    \u2705 ".concat(algorithmType.toUpperCase(), ": ").concat(standardResult.rawData.totalMotherBarsUsed, " barres, ").concat(standardResult.stats.utilizationRate, "% efficacit\xE9"));
            } catch (error) {
              console.error("    \u274C Erreur ".concat(algorithmType.toUpperCase(), ":"), error.message);
              allResults[model.key].algorithmResults[algorithmType] = null;
            }
          }
        } catch (err) {
          _iterator3.e(err);
        } finally {
          _iterator3.f();
        }
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }
    return allResults;
  },
  /**
   * ÉTAPE 3: Traite et compare tous les résultats
   */
  processAndCompareResults: function processAndCompareResults(allResults, models) {
    console.log('🤖 Traitement et comparaison des résultats');
    var finalModelResults = {};
    var globalStats = {
      totalUsedBars: 0,
      totalWaste: 0,
      totalBarLength: 0
    };

    // Comparer et sélectionner le meilleur algorithme pour chaque modèle
    for (var _i = 0, _Object$entries = Object.entries(allResults); _i < _Object$entries.length; _i++) {
      var _Object$entries$_i = algorithm_service_slicedToArray(_Object$entries[_i], 2),
        modelKey = _Object$entries$_i[0],
        modelData = _Object$entries$_i[1];
      var ffdResult = modelData.algorithmResults.ffd;
      var ilpResult = modelData.algorithmResults.ilp;
      var bestResult = this.selectBestAlgorithmForModel(modelKey, ffdResult, ilpResult);
      if (bestResult) {
        finalModelResults[modelKey] = bestResult;

        // Ajouter aux statistiques globales
        globalStats.totalUsedBars += bestResult.rawData.totalMotherBarsUsed || 0;
        globalStats.totalWaste += bestResult.rawData.wasteLength || 0;

        // Calculer la longueur totale des barres
        if (bestResult.layouts) {
          var _iterator4 = algorithm_service_createForOfIteratorHelper(bestResult.layouts),
            _step4;
          try {
            for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
              var layout = _step4.value;
              var barLength = layout.originalLength || layout.length || 0;
              var count = layout.count || 1;
              globalStats.totalBarLength += barLength * count;
            }
          } catch (err) {
            _iterator4.e(err);
          } finally {
            _iterator4.f();
          }
        }
        console.log("  ".concat(modelKey, ": ").concat(bestResult.algoUsed.toUpperCase(), " s\xE9lectionn\xE9 (").concat(bestResult.comparison.reason, ")"));
      }
    }

    // Calculer l'efficacité globale
    var globalEfficiency = globalStats.totalBarLength > 0 ? ((globalStats.totalBarLength - globalStats.totalWaste) / globalStats.totalBarLength * 100).toFixed(2) : "100.00";
    globalStats.totalEfficiency = parseFloat(globalEfficiency);
    console.log("\uD83C\uDFC6 R\xE9sum\xE9 global: ".concat(globalStats.totalUsedBars, " barres, ").concat(globalEfficiency, "% efficacit\xE9"));
    return {
      modelResults: finalModelResults,
      globalStats: globalStats,
      bestAlgorithm: 'per-model',
      models: models
    };
  },
  /**
   * NOUVEAU: Exécute UN algorithme sur UN modèle spécifique
   * Appelé directement par UI-Controller pour chaque étape
   */
  runAlgorithmOnSingleModel: function runAlgorithmOnSingleModel(algorithmType, model) {
    console.log("\uD83D\uDD04 Ex\xE9cution ".concat(algorithmType.toUpperCase(), " pour ").concat(model.label));
    try {
      // Appeler l'algorithme pur
      var algorithmResult = this.callPureAlgorithm(algorithmType, model.motherBars, model.pieces);

      // Convertir en format standardisé
      var standardResult = this.convertToStandardFormat(algorithmResult, model.key, algorithmType, model.pieces, model.motherBars);
      console.log("    \u2705 ".concat(algorithmType.toUpperCase(), ": ").concat(standardResult.rawData.totalMotherBarsUsed, " barres, ").concat(standardResult.stats.utilizationRate, "% efficacit\xE9"));
      return standardResult;
    } catch (error) {
      console.error("    \u274C Erreur ".concat(algorithmType.toUpperCase(), ":"), error.message);
      throw error;
    }
  },
  /**
   * NOUVEAU: Sélectionne le meilleur résultat entre FFD et ILP pour un modèle
   * Appelé par UI-Controller après l'exécution des deux algorithmes
   */
  selectBestForModel: function selectBestForModel(modelKey, ffdResult, ilpResult) {
    console.log("\uD83E\uDD16 Comparaison des algorithmes pour ".concat(modelKey));

    // Log des résultats disponibles
    if (ffdResult) {
      console.log("  \uD83D\uDCCA FFD: ".concat(ffdResult.rawData.totalMotherBarsUsed, " barres, ").concat(ffdResult.stats.utilizationRate, "% efficacit\xE9"));
    } else {
      console.log("  \u274C FFD: Non disponible");
    }
    if (ilpResult) {
      console.log("  \uD83D\uDCCA ILP: ".concat(ilpResult.rawData.totalMotherBarsUsed, " barres, ").concat(ilpResult.stats.utilizationRate, "% efficacit\xE9"));
    } else {
      console.log("  \u274C ILP: Non disponible");
    }
    var chosen, usedAlgo, comparison;
    if (!ilpResult) {
      chosen = ffdResult;
      usedAlgo = 'ffd';
      comparison = {
        ffd: (ffdResult === null || ffdResult === void 0 ? void 0 : ffdResult.stats.utilizationRate) || 0,
        ilp: null,
        reason: 'ILP non disponible'
      };
    } else if (!ffdResult) {
      chosen = ilpResult;
      usedAlgo = 'ilp';
      comparison = {
        ffd: null,
        ilp: (ilpResult === null || ilpResult === void 0 ? void 0 : ilpResult.stats.utilizationRate) || 0,
        reason: 'FFD non disponible'
      };
    } else {
      // Comparer FFD et ILP
      var ffdEff = ffdResult.stats.utilizationRate;
      var ilpEff = ilpResult.stats.utilizationRate;
      var ffdBars = ffdResult.rawData.totalMotherBarsUsed;
      var ilpBars = ilpResult.rawData.totalMotherBarsUsed;
      if (ilpEff > ffdEff) {
        chosen = ilpResult;
        usedAlgo = 'ilp';
        comparison = {
          ffd: ffdEff,
          ilp: ilpEff,
          reason: "ILP plus efficace (".concat(ilpEff, "% vs ").concat(ffdEff, "%)")
        };
      } else if (ffdEff > ilpEff) {
        chosen = ffdResult;
        usedAlgo = 'ffd';
        comparison = {
          ffd: ffdEff,
          ilp: ilpEff,
          reason: "FFD plus efficace (".concat(ffdEff, "% vs ").concat(ilpEff, "%)")
        };
      } else if (ilpBars < ffdBars) {
        chosen = ilpResult;
        usedAlgo = 'ilp';
        comparison = {
          ffd: ffdEff,
          ilp: ilpEff,
          reason: "M\xEAme efficacit\xE9, ILP utilise moins de barres (".concat(ilpBars, " vs ").concat(ffdBars, ")")
        };
      } else {
        chosen = ffdResult;
        usedAlgo = 'ffd';
        comparison = {
          ffd: ffdEff,
          ilp: ilpEff,
          reason: "Performances \xE9quivalentes, FFD privil\xE9gi\xE9"
        };
      }
    }
    var bestResult = algorithm_service_objectSpread(algorithm_service_objectSpread({}, chosen), {}, {
      algoUsed: usedAlgo,
      comparison: comparison
    });
    console.log("  \uD83C\uDFC6 ".concat(modelKey, ": ").concat(usedAlgo.toUpperCase(), " s\xE9lectionn\xE9 (").concat(comparison.reason, ")"));
    return bestResult;
  },
  /**
   * NOUVEAU: Construit les résultats finaux avec vérifications complètes
   * Appelé par UI-Controller à la fin
   */
  buildFinalResults: function buildFinalResults(modelResults) {
    console.log('🏗️ Construction des résultats finaux avec vérifications');
    var globalStats = {
      totalUsedBars: 0,
      totalWaste: 0,
      totalBarLength: 0
    };
    var validatedResults = {};
    var stockUsageByProfile = {}; // Suivi de l'utilisation du stock par profil

    // 1. PREMIÈRE PASSE: Vérifier chaque modèle individuellement
    for (var _i2 = 0, _Object$entries2 = Object.entries(modelResults); _i2 < _Object$entries2.length; _i2++) {
      var _Object$entries2$_i = algorithm_service_slicedToArray(_Object$entries2[_i2], 2),
        modelKey = _Object$entries2$_i[0],
        bestResult = _Object$entries2$_i[1];
      if (!bestResult) continue;
      console.log("\uD83D\uDD0D V\xE9rification du mod\xE8le ".concat(modelKey));

      // Récupérer le modèle original pour les vérifications
      var originalModel = this.getOriginalModelData(modelKey);
      if (!originalModel) {
        console.error("\u274C Mod\xE8le original ".concat(modelKey, " non trouv\xE9"));
        validatedResults[modelKey] = this.createErrorResult(bestResult, 'Données du modèle non trouvées');
        continue;
      }

      // Vérification 1: Compter les pièces produites vs demandées
      var pieceValidation = this.validatePieceCount(bestResult, originalModel.pieces);
      if (!pieceValidation.valid) {
        console.error("\u274C ".concat(modelKey, ": ").concat(pieceValidation.error));
        validatedResults[modelKey] = this.createErrorResult(bestResult, pieceValidation.error);
        continue;
      }

      // Vérification 2: Comptabiliser l'utilisation du stock
      var stockUsage = this.calculateStockUsage(bestResult, originalModel.profile);
      this.addToStockUsage(stockUsageByProfile, originalModel.profile, stockUsage);

      // Si tout est bon, ajouter aux résultats validés
      validatedResults[modelKey] = bestResult;

      // Ajouter aux statistiques globales
      globalStats.totalUsedBars += bestResult.rawData.totalMotherBarsUsed || 0;
      globalStats.totalWaste += bestResult.rawData.wasteLength || 0;
      if (bestResult.layouts) {
        var _iterator5 = algorithm_service_createForOfIteratorHelper(bestResult.layouts),
          _step5;
        try {
          for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
            var layout = _step5.value;
            var barLength = layout.originalLength || layout.length || 0;
            var count = layout.count || 1;
            globalStats.totalBarLength += barLength * count;
          }
        } catch (err) {
          _iterator5.e(err);
        } finally {
          _iterator5.f();
        }
      }
      console.log("\u2705 ".concat(modelKey, ": Validation r\xE9ussie"));
    }

    // 2. DEUXIÈME PASSE: Vérifier la disponibilité globale du stock
    console.log('🏭 Vérification de la disponibilité globale du stock');
    var stockValidation = this.validateGlobalStock(stockUsageByProfile, validatedResults);
    if (!stockValidation.valid) {
      console.error('❌ Stock insuffisant détecté');
      // Marquer les modèles problématiques
      var _iterator6 = algorithm_service_createForOfIteratorHelper(stockValidation.affectedModels),
        _step6;
      try {
        for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
          var _modelKey = _step6.value;
          if (validatedResults[_modelKey] && !validatedResults[_modelKey].error) {
            validatedResults[_modelKey] = this.createErrorResult(validatedResults[_modelKey], stockValidation.error);
          }
        }
      } catch (err) {
        _iterator6.e(err);
      } finally {
        _iterator6.f();
      }
    }

    // Calculer l'efficacité globale
    var globalEfficiency = globalStats.totalBarLength > 0 ? ((globalStats.totalBarLength - globalStats.totalWaste) / globalStats.totalBarLength * 100).toFixed(2) : "100.00";
    globalStats.totalEfficiency = parseFloat(globalEfficiency);
    console.log("\uD83C\uDFC6 R\xE9sum\xE9 global: ".concat(globalStats.totalUsedBars, " barres, ").concat(globalEfficiency, "% efficacit\xE9"));
    return {
      modelResults: validatedResults,
      globalStats: globalStats,
      bestAlgorithm: 'per-model',
      stockValidation: stockValidation
    };
  },
  /**
   * NOUVEAU: Récupère les données du modèle original à partir de la clé
   */
  getOriginalModelData: function getOriginalModelData(modelKey) {
    var _modelKey$split = modelKey.split('_'),
      _modelKey$split2 = algorithm_service_slicedToArray(_modelKey$split, 2),
      profile = _modelKey$split2[0],
      orientation = _modelKey$split2[1];

    // Récupérer les pièces demandées pour ce modèle
    var pieces = DataManager.getLengthsToCutByModel(profile, orientation);
    return {
      profile: profile,
      orientation: orientation,
      pieces: pieces
    };
  },
  /**
   * NOUVEAU: Valide que le nombre de pièces produites correspond à la demande
   */
  validatePieceCount: function validatePieceCount(result, demandedPieces) {
    console.log('  📊 Vérification du nombre de pièces');

    // Compter les pièces demandées par longueur
    var demanded = new Map();
    demandedPieces.forEach(function (piece) {
      demanded.set(piece.length, piece.quantity);
    });

    // Compter les pièces produites par longueur
    var produced = new Map();
    if (result.layouts) {
      result.layouts.forEach(function (layout) {
        var count = layout.count || 1;
        layout.cuts.forEach(function (cutLength) {
          var current = produced.get(cutLength) || 0;
          produced.set(cutLength, current + count);
        });
      });
    }

    // Vérifier chaque longueur demandée
    var _iterator7 = algorithm_service_createForOfIteratorHelper(demanded.entries()),
      _step7;
    try {
      for (_iterator7.s(); !(_step7 = _iterator7.n()).done;) {
        var _step7$value = algorithm_service_slicedToArray(_step7.value, 2),
          length = _step7$value[0],
          demandedQty = _step7$value[1];
        var producedQty = produced.get(length) || 0;
        if (producedQty < demandedQty) {
          return {
            valid: false,
            error: "Pi\xE8ces manquantes: ".concat(demandedQty - producedQty, " pi\xE8ce(s) de ").concat(length, "mm non produites. \nEssayez avec plus de barres m\xE8res.")
          };
        }
        if (producedQty > demandedQty) {
          return {
            valid: false,
            error: "Pi\xE8ces en exc\xE8s: ".concat(producedQty - demandedQty, " pi\xE8ce(s) de ").concat(length, "mm en trop. \nV\xE9rifiez les quantit\xE9s de barres m\xE8res.")
          };
        }
      }

      // Vérifier qu'il n'y a pas de pièces produites non demandées
    } catch (err) {
      _iterator7.e(err);
    } finally {
      _iterator7.f();
    }
    var _iterator8 = algorithm_service_createForOfIteratorHelper(produced.entries()),
      _step8;
    try {
      for (_iterator8.s(); !(_step8 = _iterator8.n()).done;) {
        var _step8$value = algorithm_service_slicedToArray(_step8.value, 2),
          _length = _step8$value[0],
          _producedQty = _step8$value[1];
        if (!demanded.has(_length)) {
          return {
            valid: false,
            error: "Pi\xE8ces non demand\xE9es: ".concat(_producedQty, " pi\xE8ce(s) de ").concat(_length, "mm produites sans demande. \nV\xE9rifiez la configuration.")
          };
        }
      }
    } catch (err) {
      _iterator8.e(err);
    } finally {
      _iterator8.f();
    }
    console.log('    ✅ Nombre de pièces correct');
    return {
      valid: true
    };
  },
  /**
   * NOUVEAU: Calcule l'utilisation du stock pour un résultat
   */
  calculateStockUsage: function calculateStockUsage(result, profile) {
    var usage = new Map(); // Map<longueur, quantité>

    if (result.layouts) {
      result.layouts.forEach(function (layout) {
        var barLength = layout.originalLength || layout.length;
        var count = layout.count || 1;
        var current = usage.get(barLength) || 0;
        usage.set(barLength, current + count);
      });
    }
    return usage;
  },
  /**
   * NOUVEAU: Ajoute l'utilisation à l'accumulation globale
   */
  addToStockUsage: function addToStockUsage(stockUsageByProfile, profile, usage) {
    if (!stockUsageByProfile[profile]) {
      stockUsageByProfile[profile] = new Map();
    }
    var _iterator9 = algorithm_service_createForOfIteratorHelper(usage.entries()),
      _step9;
    try {
      for (_iterator9.s(); !(_step9 = _iterator9.n()).done;) {
        var _step9$value = algorithm_service_slicedToArray(_step9.value, 2),
          length = _step9$value[0],
          qty = _step9$value[1];
        var current = stockUsageByProfile[profile].get(length) || 0;
        stockUsageByProfile[profile].set(length, current + qty);
      }
    } catch (err) {
      _iterator9.e(err);
    } finally {
      _iterator9.f();
    }
  },
  /**
   * NOUVEAU: Valide que le stock global est suffisant
   */
  validateGlobalStock: function validateGlobalStock(stockUsageByProfile, validatedResults) {
    console.log('  🏭 Vérification du stock global');
    var errors = [];
    var affectedModels = [];
    var _loop = function _loop() {
      var _Object$entries3$_i = algorithm_service_slicedToArray(_Object$entries3[_i3], 2),
        profile = _Object$entries3$_i[0],
        usage = _Object$entries3$_i[1];
      // Récupérer le stock disponible pour ce profil
      var availableStock = DataManager.getMotherBarsByProfile(profile);
      var stockMap = new Map();
      availableStock.forEach(function (stock) {
        stockMap.set(stock.length, stock.quantity);
      });

      // Vérifier chaque longueur utilisée
      var _iterator0 = algorithm_service_createForOfIteratorHelper(usage.entries()),
        _step0;
      try {
        for (_iterator0.s(); !(_step0 = _iterator0.n()).done;) {
          var _step0$value = algorithm_service_slicedToArray(_step0.value, 2),
            length = _step0$value[0],
            usedQty = _step0$value[1];
          var availableQty = stockMap.get(length) || 0;
          if (usedQty > availableQty) {
            var deficit = usedQty - availableQty;
            var error = "Stock insuffisant pour ".concat(profile, ": ").concat(deficit, " barre(s) de ").concat(length, "mm manquante(s) (demand\xE9: ").concat(usedQty, ", disponible: ").concat(availableQty, "). \n\nAjoutez plus de barres m\xE8res.");
            errors.push(error);

            // Identifier les modèles affectés
            Object.keys(validatedResults).forEach(function (modelKey) {
              if (modelKey.startsWith(profile + '_')) {
                affectedModels.push(modelKey);
              }
            });
          }
        }
      } catch (err) {
        _iterator0.e(err);
      } finally {
        _iterator0.f();
      }
    };
    for (var _i3 = 0, _Object$entries3 = Object.entries(stockUsageByProfile); _i3 < _Object$entries3.length; _i3++) {
      _loop();
    }
    if (errors.length > 0) {
      return {
        valid: false,
        error: errors.join(' '),
        affectedModels: algorithm_service_toConsumableArray(new Set(affectedModels)) // Supprimer les doublons
      };
    }
    console.log('    ✅ Stock global suffisant');
    return {
      valid: true
    };
  },
  /**
   * NOUVEAU: Crée un résultat d'erreur pour un modèle
   */
  createErrorResult: function createErrorResult(originalResult, errorMessage) {
    return algorithm_service_objectSpread(algorithm_service_objectSpread({}, originalResult), {}, {
      error: errorMessage,
      layouts: [],
      // Vider les schémas de coupe
      rawData: algorithm_service_objectSpread(algorithm_service_objectSpread({}, originalResult.rawData), {}, {
        totalMotherBarsUsed: 0,
        wasteLength: 0
      }),
      stats: algorithm_service_objectSpread(algorithm_service_objectSpread({}, originalResult.stats), {}, {
        utilizationRate: 0
      })
    });
  },
  /**
   * Appelle l'algorithme pur (FFD ou ILP)
   */
  callPureAlgorithm: function callPureAlgorithm(algorithmType, motherBars, pieces) {
    if (algorithmType === 'ffd') {
      return algorithms.solveGreedyFFD(motherBars, pieces);
    } else if (algorithmType === 'ilp') {
      return algorithms.solveWithILP(motherBars, pieces);
    } else {
      throw new Error("Algorithme non support\xE9: ".concat(algorithmType));
    }
  },
  /**
   * Formate le label d'un modèle pour l'affichage
   */
  formatModelLabel: function formatModelLabel(profile, orientation) {
    var orientationText = '';
    switch (orientation) {
      case 'a-plat':
        orientationText = 'À plat';
        break;
      case 'debout':
        orientationText = 'Debout';
        break;
      default:
        orientationText = orientation;
    }
    return "".concat(profile, " - ").concat(orientationText);
  },
  /**
   * Convertit le résultat d'algorithme pur en format standardisé
   */
  convertToStandardFormat: function convertToStandardFormat(algorithmResult, modelKey, algorithmType, originalPieces, originalMotherBars) {
    var cuttingPatterns = algorithmResult.cuttingPatterns || [];

    // Créer les layouts à partir des patterns
    var layouts = cuttingPatterns.map(function (pattern) {
      return {
        originalLength: pattern.motherBarLength,
        length: pattern.motherBarLength,
        cuts: algorithm_service_toConsumableArray(pattern.cuts),
        count: pattern.count,
        waste: pattern.waste,
        remainingLength: pattern.waste
      };
    });

    // Calculer les statistiques
    var totalMotherBarsUsed = cuttingPatterns.reduce(function (sum, pattern) {
      return sum + pattern.count;
    }, 0);
    var totalWasteLength = cuttingPatterns.reduce(function (sum, pattern) {
      return sum + pattern.waste * pattern.count;
    }, 0);
    var totalBarLength = cuttingPatterns.reduce(function (sum, pattern) {
      return sum + pattern.motherBarLength * pattern.count;
    }, 0);
    var totalUsedLength = totalBarLength - totalWasteLength;
    var utilizationRate = totalBarLength > 0 ? (totalUsedLength / totalBarLength * 100).toFixed(3) : "0.000";

    // Vérifier les pièces restantes
    var remainingPieces = this.calculateRemainingPieces(originalPieces, cuttingPatterns);
    return {
      layouts: layouts,
      rawData: {
        totalMotherBarsUsed: totalMotherBarsUsed,
        wasteLength: totalWasteLength,
        remainingPieces: remainingPieces,
        usedBars: this.convertPatternsToUsedBars(cuttingPatterns)
      },
      stats: {
        utilizationRate: parseFloat(utilizationRate),
        totalBarLength: totalBarLength,
        totalUsedLength: totalUsedLength,
        totalWasteLength: totalWasteLength
      },
      algorithmName: algorithmType === 'ffd' ? 'First-Fit Decreasing' : 'Programmation Linéaire (ILP)',
      algorithmType: algorithmType
    };
  },
  /**
   * Calcule les pièces restantes non découpées
   */
  calculateRemainingPieces: function calculateRemainingPieces(originalPieces, cuttingPatterns) {
    var demandByLength = new Map();
    var cutByLength = new Map();

    // Compter la demande
    originalPieces.forEach(function (piece) {
      var current = demandByLength.get(piece.length) || 0;
      demandByLength.set(piece.length, current + piece.quantity);
    });

    // Compter les pièces découpées
    cuttingPatterns.forEach(function (pattern) {
      pattern.cuts.forEach(function (cut) {
        var current = cutByLength.get(cut) || 0;
        cutByLength.set(cut, current + pattern.count);
      });
    });

    // Calculer les pièces restantes
    var remaining = [];
    demandByLength.forEach(function (demand, length) {
      var cut = cutByLength.get(length) || 0;
      var deficit = demand - cut;
      if (deficit > 0) {
        for (var i = 0; i < deficit; i++) {
          remaining.push(length);
        }
      }
    });
    return remaining;
  },
  /**
   * Convertit les patterns en format usedBars pour compatibilité
   */
  convertPatternsToUsedBars: function convertPatternsToUsedBars(cuttingPatterns) {
    var usedBars = [];
    cuttingPatterns.forEach(function (pattern, index) {
      for (var i = 0; i < pattern.count; i++) {
        usedBars.push({
          barId: "pattern_".concat(index, "_").concat(i),
          originalLength: pattern.motherBarLength,
          length: pattern.motherBarLength,
          cuts: algorithm_service_toConsumableArray(pattern.cuts),
          remainingLength: pattern.waste
        });
      }
    });
    return usedBars;
  },
  /**
   * FONCTIONS DE COMPATIBILITÉ avec l'ancien code
   */

  // Point d'entrée pour la comparaison (redirige vers la fonction principale)
  runAlgorithm: function runAlgorithm(type, data) {
    // Ignorer les paramètres et utiliser directement le DataManager
    return this.runOptimization();
  },
  runComparisonOptimization: function runComparisonOptimization(data) {
    return this.runOptimization();
  },
  runFFDAlgorithm: function runFFDAlgorithm(data) {
    return this.runOptimization();
  },
  runILPAlgorithm: function runILPAlgorithm(data) {
    return this.runOptimization();
  },
  compareAlgorithms: function compareAlgorithms(data) {
    return this.runOptimization();
  },
  /**
   * Fonction pour traiter un pattern individuel (pour ResultsRenderer)
   */
  processPattern: function processPattern(layout) {
    var cuts = layout.cuts || [];
    var barLength = layout.originalLength || layout.length || 0;
    var waste = layout.waste || layout.remainingLength || 0;
    var count = layout.count || 1;

    // Grouper les coupes par longueur
    var cutCounts = {};
    cuts.forEach(function (cut) {
      cutCounts[cut] = (cutCounts[cut] || 0) + 1;
    });

    // Convertir en format pour l'affichage
    var processedCuts = Object.entries(cutCounts).map(function (_ref) {
      var _ref2 = algorithm_service_slicedToArray(_ref, 2),
        length = _ref2[0],
        count = _ref2[1];
      return {
        length: parseInt(length),
        count: count
      };
    }).sort(function (a, b) {
      return b.length - a.length;
    }); // Trier par longueur décroissante

    // Créer les pièces visuelles pour la barre
    var visualPieces = [];
    cuts.forEach(function (cutLength, index) {
      var percentage = cutLength / barLength * 100;
      visualPieces.push({
        length: cutLength,
        percentage: percentage,
        isLast: index === cuts.length - 1
      });
    });

    // Calculer le pourcentage de chute
    var wastePercentage = barLength > 0 ? waste / barLength * 100 : 0;
    return {
      cuts: processedCuts,
      visualPieces: visualPieces,
      barLength: barLength,
      waste: waste,
      wastePercentage: wastePercentage,
      count: count
    };
  },
  /**
   * FONCTION MANQUANTE: Calcule les statistiques globales (pour compatibilité avec ResultsRenderer)
   */
  calculateGlobalStats: function calculateGlobalStats(results) {
    console.log('📊 Calcul des statistiques globales');
    var modelResults = results.modelResults || {};
    var totalUsedBars = 0;
    var totalWaste = 0;
    var totalBarLength = 0;

    // Parcourir tous les résultats de modèles
    for (var _i4 = 0, _Object$entries4 = Object.entries(modelResults); _i4 < _Object$entries4.length; _i4++) {
      var _Object$entries4$_i = algorithm_service_slicedToArray(_Object$entries4[_i4], 2),
        modelKey = _Object$entries4$_i[0],
        modelResult = _Object$entries4$_i[1];
      if (!modelResult) continue;

      // Ajouter les données brutes
      if (modelResult.rawData) {
        totalUsedBars += modelResult.rawData.totalMotherBarsUsed || 0;
        totalWaste += modelResult.rawData.wasteLength || 0;
      }

      // Calculer à partir des layouts
      if (modelResult.layouts && Array.isArray(modelResult.layouts)) {
        var _iterator1 = algorithm_service_createForOfIteratorHelper(modelResult.layouts),
          _step1;
        try {
          for (_iterator1.s(); !(_step1 = _iterator1.n()).done;) {
            var layout = _step1.value;
            var barLength = layout.originalLength || layout.length || 0;
            var count = layout.count || 1;
            totalBarLength += barLength * count;
          }
        } catch (err) {
          _iterator1.e(err);
        } finally {
          _iterator1.f();
        }
      }
    }

    // Calculer l'efficacité globale
    var totalEfficiency = totalBarLength > 0 ? ((totalBarLength - totalWaste) / totalBarLength * 100).toFixed(2) : "100.00";
    return {
      totalUsedBars: totalUsedBars,
      totalWaste: totalWaste,
      totalBarLength: totalBarLength,
      totalEfficiency: parseFloat(totalEfficiency),
      // Compatibilité avec l'ancien format
      totalBarsUsed: totalUsedBars,
      wasteLength: totalWaste
    };
  },
  /**
   * FONCTION MANQUANTE: Calcule les statistiques d'un modèle (pour compatibilité avec ResultsRenderer)
   */
  calculateModelStats: function calculateModelStats(modelResult) {
    if (!modelResult || !modelResult.layouts) {
      return {
        barCount: 0,
        totalLength: 0,
        wasteLength: 0,
        efficiency: 0
      };
    }
    var barCount = 0;
    var totalLength = 0;
    var wasteLength = 0;
    modelResult.layouts.forEach(function (layout) {
      var count = layout.count || 1;
      var length = layout.originalLength || layout.length || 0;
      var waste = layout.waste || layout.remainingLength || 0;
      barCount += count;
      totalLength += length * count;
      wasteLength += waste * count;
    });
    var efficiency = totalLength > 0 ? ((totalLength - wasteLength) / totalLength * 100).toFixed(1) : "0.0";
    return {
      barCount: barCount,
      totalLength: totalLength,
      wasteLength: wasteLength,
      efficiency: parseFloat(efficiency)
    };
  },
  /**
   * NOUVEAU: Exécute TOUS les algorithmes sur UN modèle spécifique
   * Appelé directement par UI-Controller pour chaque étape de modèle
   */
  runAllAlgorithmsOnSingleModel: function runAllAlgorithmsOnSingleModel(model) {
    console.log("\uD83C\uDFAF Ex\xE9cution compl\xE8te des algorithmes pour ".concat(model.label));
    var results = {
      model: model,
      ffdResult: null,
      ilpResult: null
    };

    // Exécuter FFD
    try {
      console.log("  \uD83D\uDD04 FFD pour ".concat(model.key));
      var ffdResult = this.runAlgorithmOnSingleModel('ffd', model);
      results.ffdResult = ffdResult;
      console.log("    \u2705 FFD: ".concat(ffdResult.rawData.totalMotherBarsUsed, " barres, ").concat(ffdResult.stats.utilizationRate, "% efficacit\xE9"));
    } catch (error) {
      console.error("    \u274C Erreur FFD:", error.message);
      results.ffdResult = null;
    }

    // Exécuter ILP
    try {
      console.log("  \uD83D\uDD04 ILP pour ".concat(model.key));
      var ilpResult = this.runAlgorithmOnSingleModel('ilp', model);
      results.ilpResult = ilpResult;
      console.log("    \u2705 ILP: ".concat(ilpResult.rawData.totalMotherBarsUsed, " barres, ").concat(ilpResult.stats.utilizationRate, "% efficacit\xE9"));
    } catch (error) {
      console.error("    \u274C Erreur ILP:", error.message);
      results.ilpResult = null;
    }
    console.log("\uD83C\uDFC1 Optimisation termin\xE9e pour ".concat(model.label));
    return results;
  }
};
;// ./src/js/F4C-manager.js
function F4C_manager_typeof(o) { "@babel/helpers - typeof"; return F4C_manager_typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, F4C_manager_typeof(o); }
function F4C_manager_ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function F4C_manager_objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? F4C_manager_ownKeys(Object(t), !0).forEach(function (r) { F4C_manager_defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : F4C_manager_ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function F4C_manager_defineProperty(e, r, t) { return (r = F4C_manager_toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function F4C_manager_toPropertyKey(t) { var i = F4C_manager_toPrimitive(t, "string"); return "symbol" == F4C_manager_typeof(i) ? i : i + ""; }
function F4C_manager_toPrimitive(t, r) { if ("object" != F4C_manager_typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != F4C_manager_typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function F4C_manager_toConsumableArray(r) { return F4C_manager_arrayWithoutHoles(r) || F4C_manager_iterableToArray(r) || F4C_manager_unsupportedIterableToArray(r) || F4C_manager_nonIterableSpread(); }
function F4C_manager_nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function F4C_manager_iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function F4C_manager_arrayWithoutHoles(r) { if (Array.isArray(r)) return F4C_manager_arrayLikeToArray(r); }
function F4C_manager_createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = F4C_manager_unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function F4C_manager_slicedToArray(r, e) { return F4C_manager_arrayWithHoles(r) || F4C_manager_iterableToArrayLimit(r, e) || F4C_manager_unsupportedIterableToArray(r, e) || F4C_manager_nonIterableRest(); }
function F4C_manager_nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function F4C_manager_unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return F4C_manager_arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? F4C_manager_arrayLikeToArray(r, a) : void 0; } }
function F4C_manager_arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function F4C_manager_iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function F4C_manager_arrayWithHoles(r) { if (Array.isArray(r)) return r; }
/**
 * F4C Manager - Gère la création d'objets F4C à partir des schémas de coupe
 * Chaque objet F4C représente une barre mère à découper avec les références des pièces
 */


var F4CManager = {
  /**
   * Génère les objets F4C à partir des résultats d'optimisation
   * @param {Object} optimizationResults - Résultats de l'optimisation
   * @returns {Array} Liste d'objets F4C
   */
  generateF4CObjects: function generateF4CObjects(optimizationResults) {
    var pools = this.createPools(optimizationResults);
    var F4CObjects = this.createF4CFromPools(pools);
    return F4CObjects;
  },
  /**
   * Crée les pools à partir des résultats d'optimisation
   * @param {Object} optimizationResults - Résultats de l'optimisation  
   * @returns {Array} Liste de pools
   */
  createPools: function createPools(optimizationResults) {
    var pools = [];
    var modelResults = optimizationResults.modelResults;
    var modelNames = Object.keys(modelResults);
    for (var _i = 0, _modelNames = modelNames; _i < _modelNames.length; _i++) {
      var modelName = _modelNames[_i];
      var _modelName$split = modelName.split('_'),
        _modelName$split2 = F4C_manager_slicedToArray(_modelName$split, 2),
        profile = _modelName$split2[0],
        orientation = _modelName$split2[1];
      var pool = this.createNewPool();
      pool.profile = profile;
      pool.orientation = orientation;
      var modelData = modelResults[modelName];
      if (modelData.layouts && Array.isArray(modelData.layouts)) {
        var _iterator = F4C_manager_createForOfIteratorHelper(modelData.layouts),
          _step;
        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var layout = _step.value;
            for (var i = 0; i < layout.count; i++) {
              var layout_object = {
                length: layout.originalLength || layout.length,
                cuts: layout.cuts
              };
              pool.layouts.push(layout_object);
            }
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }
      }
      pool.pieces = DataManager.getPiecesByModel(pool.profile, pool.orientation);
      pools.push(pool);
    }
    return pools;
  },
  /**
   * Crée les objets F4C finaux à partir des pools
   * @param {Array} pools - Les pools générés précédemment
   * @returns {Array} Liste d'objets F4C
   */
  createF4CFromPools: function createF4CFromPools(pools) {
    console.log('Création des F4C à partir des pools...');
    var F4CList = [];
    var _iterator2 = F4C_manager_createForOfIteratorHelper(pools),
      _step2;
    try {
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
        var pool = _step2.value;
        // Créer une copie des pièces disponibles pour cette pool
        var availablePieces = F4C_manager_toConsumableArray(pool.pieces);

        // Pour chaque layout, créer un F4C
        var _iterator3 = F4C_manager_createForOfIteratorHelper(pool.layouts),
          _step3;
        try {
          for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
            var layout = _step3.value;
            var F4C = {
              profile: pool.profile,
              length: layout.length,
              orientation: pool.orientation,
              B035: 0,
              // Sera défini par la première pièce
              B021: 0,
              // Sera défini par la première pièce
              pieces: []
            };

            // Assigner les pièces aux cuts du layout
            var _iterator4 = F4C_manager_createForOfIteratorHelper(layout.cuts),
              _step4;
            try {
              var _loop = function _loop() {
                var cutLength = _step4.value;
                // Trouver une pièce correspondante dans les pièces disponibles
                var pieceIndex = availablePieces.findIndex(function (piece) {
                  return piece.length === cutLength;
                });
                if (pieceIndex !== -1) {
                  // Assigner cette pièce au F4C
                  var assignedPiece = availablePieces[pieceIndex];
                  F4C.pieces.push(F4C_manager_objectSpread({}, assignedPiece)); // Copie de la pièce

                  // Si c'est la première pièce, définir B035 et B021
                  if (F4C.pieces.length === 1 && assignedPiece.f4cData) {
                    F4C.B035 = assignedPiece.f4cData.B035 || "0";
                    F4C.B021 = assignedPiece.f4cData.B021 || "0";
                  }

                  // Réduire la quantité ou retirer la pièce si quantité = 1
                  if (assignedPiece.quantity > 1) {
                    assignedPiece.quantity--;
                  } else {
                    availablePieces.splice(pieceIndex, 1);
                  }
                } else {
                  console.warn("Aucune pi\xE8ce trouv\xE9e pour la coupe de longueur ".concat(cutLength));
                }
              };
              for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
                _loop();
              }
            } catch (err) {
              _iterator4.e(err);
            } finally {
              _iterator4.f();
            }
            F4CList.push(F4C);
          }
        } catch (err) {
          _iterator3.e(err);
        } finally {
          _iterator3.f();
        }
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }
    console.log('F4C créés:', F4CList);
    return F4CList;
  },
  /**
   * Génère un rapport de synthèse des objets F4C
   * @param {Array} F4CObjects - Liste des objets F4C (nouveau format)
   * @returns {Object} Rapport de synthèse
   */
  generateSummaryReport: function generateSummaryReport(F4CObjects) {
    if (!F4CObjects || F4CObjects.length === 0) {
      return {
        totalF4C: 0,
        totalPieces: 0,
        byProfile: {},
        byOrientation: {},
        summary: "Aucun F4C généré"
      };
    }
    var report = {
      totalF4C: F4CObjects.length,
      totalPieces: 0,
      byProfile: {},
      byOrientation: {},
      details: []
    };

    // Analyser chaque F4C
    F4CObjects.forEach(function (F4C, index) {
      var piecesCount = F4C.pieces ? F4C.pieces.length : 0;
      report.totalPieces += piecesCount;

      // Compter par profil
      if (!report.byProfile[F4C.profile]) {
        report.byProfile[F4C.profile] = {
          count: 0,
          pieces: 0
        };
      }
      report.byProfile[F4C.profile].count++;
      report.byProfile[F4C.profile].pieces += piecesCount;

      // Compter par orientation
      if (!report.byOrientation[F4C.orientation]) {
        report.byOrientation[F4C.orientation] = {
          count: 0,
          pieces: 0
        };
      }
      report.byOrientation[F4C.orientation].count++;
      report.byOrientation[F4C.orientation].pieces += piecesCount;

      // Détails par F4C
      report.details.push({
        index: index + 1,
        profile: F4C.profile,
        orientation: F4C.orientation,
        length: F4C.length,
        piecesCount: piecesCount,
        B035: F4C.B035,
        B021: F4C.B021,
        pieceNames: F4C.pieces ? F4C.pieces.map(function (p) {
          return p.nom;
        }).join(', ') : ''
      });
    });

    // Générer le résumé textuel
    var profileSummary = Object.entries(report.byProfile).map(function (_ref) {
      var _ref2 = F4C_manager_slicedToArray(_ref, 2),
        profile = _ref2[0],
        data = _ref2[1];
      return "".concat(profile, ": ").concat(data.count, " F4C(s), ").concat(data.pieces, " pi\xE8ce(s)");
    }).join(' | ');
    var orientationSummary = Object.entries(report.byOrientation).map(function (_ref3) {
      var _ref4 = F4C_manager_slicedToArray(_ref3, 2),
        orientation = _ref4[0],
        data = _ref4[1];
      return "".concat(orientation, ": ").concat(data.count, " F4C(s), ").concat(data.pieces, " pi\xE8ce(s)");
    }).join(' | ');
    report.summary = "".concat(report.totalF4C, " F4C(s) g\xE9n\xE9r\xE9s avec ").concat(report.totalPieces, " pi\xE8ce(s) au total. Profils: ").concat(profileSummary, ". Orientations: ").concat(orientationSummary, ".");
    return report;
  },
  /**
   * Nouvel Objet F4C
   * @returns {Object} Un nouvel objet F4C
   */
  createNewPool: function createNewPool() {
    return {
      profile: "",
      orientation: "",
      pieces: [],
      layouts: []
    };
  }
};
;// ./src/js/results-renderer.js
/**
 * ResultsRenderer - Handles rendering of algorithm results in the UI
 */

var ResultsRenderer = {
  /**
   * Format model key to user-friendly display name
   */
  formatModelName: function formatModelName(modelKey) {
    var parts = modelKey.split('_');
    var profile = parts[0];
    var orientation = parts[1];
    var orientationText = '';
    switch (orientation) {
      case 'a-plat':
        orientationText = 'À plat';
        break;
      case 'debout':
        orientationText = 'Debout';
        break;
      case 'undefined':
        orientationText = 'Non définie';
        break;
      default:
        orientationText = orientation;
    }
    return "".concat(profile, " - ").concat(orientationText);
  },
  /**
   * NOUVEAU: Formate une longueur en centimètres vers mètres avec décimales intelligentes
   */
  formatLengthInMeters: function formatLengthInMeters(lengthInMm) {
    var meters = lengthInMm / 1000;

    // Si c'est un nombre entier, pas de décimales
    if (meters % 1 === 0) {
      return "".concat(meters);
    }

    // Sinon, formatage avec jusqu'à 3 décimales en supprimant les zéros inutiles
    var formatted = meters.toFixed(3);
    var cleanFormatted = parseFloat(formatted).toString();
    return "".concat(cleanFormatted);
  },
  /**
   * NOUVEAU: Calcule la largeur minimum nécessaire pour afficher du texte
   */
  shouldShowTextInPiece: function shouldShowTextInPiece(percentage, text) {
    // Estimation grossière : il faut au moins 30px pour afficher du texte lisible
    // Si la largeur représentée est inférieure à 8%, on n'affiche pas le texte
    return percentage >= 8 && text.toString().length <= 4;
  },
  /**
   * Render algorithm results to the container
   */
  renderResults: function renderResults(results, algorithmService) {
    // Résumé global
    var globalSummaryContainer = document.getElementById('global-summary-container');
    if (globalSummaryContainer) {
      globalSummaryContainer.innerHTML = this.renderGlobalSummary(results, algorithmService.calculateGlobalStats(results));
    }

    // Détails par modèle
    var modelDetailsContainer = document.getElementById('model-details-container');
    if (modelDetailsContainer) {
      modelDetailsContainer.innerHTML = this.renderModelDetails(results, algorithmService);
    }
  },
  /**
   * Render error message
   */
  renderErrorMessage: function renderErrorMessage(container, title, message) {
    container.innerHTML = "\n      <div class=\"error-message\">\n        <h3>".concat(title, "</h3>\n        <p>").concat(message, "</p>\n      </div>\n    ");
  },
  /**
   * Render global statistics summary
   */
  renderGlobalSummary: function renderGlobalSummary(results, stats) {
    var html = "\n      <div class=\"results-summary\">\n        <h2>R\xE9sultats de l'optimisation</h2>\n    ";

    // Add discrete algorithm information if available
    if (results.comparison) {
      html += this.renderAlgorithmInfo(results.comparison, results.bestAlgorithm);
    }

    // MODIFIÉ: Grille compacte avec ordre spécifique
    html += "\n        <div class=\"stats-grid-compact\">\n          <div class=\"stat-card-compact efficiency-card\">\n            <div class=\"stat-label-compact\">Efficacit\xE9</div>\n            <div class=\"stat-value-compact\">".concat(stats.totalEfficiency, "%</div>\n          </div>\n          <div class=\"stat-card-compact\">\n            <div class=\"stat-label-compact\">Chutes</div>\n            <div class=\"stat-value-compact\">").concat(UIUtils.formatLenght(Math.round(stats.totalWaste)), " mm</div>\n          </div>\n          <div class=\"stat-card-compact\">\n            <div class=\"stat-label-compact\">Barres m\xE8res</div>\n            <div class=\"stat-value-compact\">").concat(stats.totalUsedBars, "</div>\n          </div>\n          <div class=\"stat-card-compact\">\n            <div class=\"stat-label-compact\">Longueur totale</div>\n            <div class=\"stat-value-compact\">").concat(UIUtils.formatLenght(stats.totalBarLength), " mm</div>\n          </div>\n        </div>\n      </div>\n    ");
    return html;
  },
  /**
   * Render discrete algorithm information (3 lines)
   */
  renderAlgorithmInfo: function renderAlgorithmInfo(comparison, bestAlgorithm) {
    var algorithmName = bestAlgorithm === 'ffd' ? 'First-Fit Decreasing' : 'Programmation Linéaire';
    return "\n      <div class=\"algorithm-info\">\n        <p class=\"algorithm-used\">Algorithme utilis\xE9 : <strong>".concat(algorithmName, "</strong></p>\n        <p class=\"algorithm-comparison\">\n          FFD : ").concat(comparison.ffdEfficiency, "% | ILP : ").concat(comparison.ilpEfficiency, "%\n        </p>\n      </div>\n    ");
  },
  /**
   * Render model details sections
   */
  renderModelDetails: function renderModelDetails(results, algorithmService) {
    var modelResults = results.modelResults || {};
    var html = "\n      <h3 class=\"mb-3\">D\xE9tails par mod\xE8le</h3>\n      <div class=\"model-results\">\n    ";

    // Add each model's results
    for (var model in modelResults) {
      var modelResult = modelResults[model];
      var modelStats = algorithmService.calculateModelStats(modelResult);
      html += this.renderModelCard(model, modelResult, modelStats, algorithmService);
    }
    html += "</div>";
    return html;
  },
  /**
   * Render a single model card
   */
  renderModelCard: function renderModelCard(modelName, modelResult, stats, algorithmService) {
    var _this = this;
    // Format the model name for display
    var displayName = this.formatModelName(modelName);

    // NOUVEAU: Vérifier s'il y a une erreur
    if (modelResult.error) {
      return this.renderErrorModelCard(displayName, modelResult.error);
    }
    var algoLine = '';
    if (modelResult.algoUsed && modelResult.comparison) {
      var used = modelResult.algoUsed === 'ffd' ? 'First-Fit Decreasing' : 'Programmation Linéaire';
      var otherKey = modelResult.algoUsed === 'ffd' ? 'ilp' : 'ffd';
      var otherName = otherKey === 'ffd' ? 'First-Fit Decreasing' : 'Programmation Linéaire';
      var usedEff = modelResult.comparison[modelResult.algoUsed];
      var otherEff = modelResult.comparison[otherKey];
      algoLine = "\n        <div class=\"algo-model-info\" style=\"font-size: 0.75em; color: var(--text-secondary); margin-bottom: 0.5rem; opacity: 0.85;\">\n          </br>\n          <div>\n            <span><strong>".concat(used, "</strong> : ").concat(usedEff !== null && usedEff !== undefined ? usedEff + '%' : 'N/A', "</span>\n          </div>\n          <div>\n            <span>").concat(otherName, " : ").concat(otherEff !== null && otherEff !== undefined ? otherEff + '%' : 'N/A', "</span>\n          </div>\n        </div>\n      ");
    }
    var html = "\n      <div class=\"model-card\">\n        <div class=\"model-header\">\n          <h3>".concat(displayName, "</h3>\n          ").concat(algoLine, "\n        </div>\n        <div class=\"model-content\">\n          <div class=\"model-stats\">\n            <div class=\"model-stat\">\n              <div class=\"stat-label\">Efficacit\xE9</div>\n              <div class=\"stat-value efficiency-tag\">").concat(stats.efficiency, "%</div>\n            </div>\n            <div class=\"model-stat\">\n              <div class=\"stat-label\">Chutes</div>\n              <div class=\"stat-value\">").concat(UIUtils.formatLenght(Math.round(stats.wasteLength)), " mm</div>\n            </div>\n            <div class=\"model-stat\">\n              <div class=\"stat-label\">Barres m\xE8res</div>\n              <div class=\"stat-value\">").concat(stats.barCount, "</div>\n            </div>\n            <div class=\"model-stat\">\n              <div class=\"stat-label\">Longueur totale</div>\n              <div class=\"stat-value\">").concat(UIUtils.formatLenght(stats.totalLength), " mm</div>\n            </div>\n          </div>\n          <div class=\"cut-schemes\">\n            <h4 class=\"mb-2\">Sch\xE9mas de coupe</h4>\n    ");

    // Add each cutting pattern
    if (modelResult.layouts && modelResult.layouts.length > 0) {
      modelResult.layouts.forEach(function (layout, index) {
        var processedPattern = algorithmService.processPattern(layout);
        html += _this.renderCutScheme(processedPattern, index);
      });
    } else {
      html += '<p class="info-text">Aucun schéma de coupe disponible.</p>';
    }
    html += "\n          </div>\n        </div>\n      </div>\n    ";
    return html;
  },
  /**
   * NOUVEAU: Render une carte d'erreur pour un modèle
   */
  renderErrorModelCard: function renderErrorModelCard(modelName, errorMessage) {
    // Diviser le message d'erreur si il contient <br><br>
    var messageParts = errorMessage.split('\n');
    var mainMessage = messageParts[0];
    var suggestion = messageParts[1] || '';
    var suggestionHtml = '';
    if (suggestion) {
      suggestionHtml = "<div class=\"error-suggestion\">".concat(suggestion, "</div>");
    }
    return "\n      <div class=\"model-card error-card\">\n        <div class=\"model-header\">\n          <h3>".concat(modelName, "</h3>\n        </div>\n        <div class=\"model-content\">\n          <div class=\"error-content\">\n            <div class=\"error-icon\">\u26A0\uFE0F</div>\n            <div class=\"error-message\">\n              <h4>Optimisation impossible</h4>\n              <p class=\"error-main\">").concat(mainMessage, "</p>\n              ").concat(suggestionHtml, "\n            </div>\n          </div>\n        </div>\n      </div>\n    ");
  },
  /**
   * Render a single cut scheme
   */
  renderCutScheme: function renderCutScheme(pattern, index) {
    var _this2 = this;
    // Generate the text representation of cuts
    var cutsHtml = '';
    pattern.cuts.forEach(function (cut) {
      cutsHtml += "<span class=\"cut-count\">".concat(cut.count, "\xD7</span>").concat(UIUtils.formatLenght(cut.length), " mm ");
    });

    // Generate visual representation of the cuts
    var visualBarHtml = '';
    pattern.visualPieces.forEach(function (piece, pieceIndex) {
      var lastPieceClass = piece.isLast ? 'last-piece' : '';
      var showText = _this2.shouldShowTextInPiece(piece.percentage, piece.length);
      visualBarHtml += "\n        <div class=\"cut-piece ".concat(lastPieceClass, "\" \n             style=\"width: ").concat(piece.percentage, "%\" \n             title=\"").concat(UIUtils.formatLenght(piece.length), " mm\">\n          ").concat(showText ? UIUtils.formatLenght(piece.length) : '', "\n        </div>\n      ");
    });

    // Add waste piece if any
    if (pattern.waste > 0) {
      var showWasteText = this.shouldShowTextInPiece(pattern.wastePercentage, pattern.waste);
      visualBarHtml += "\n        <div class=\"waste-piece\" \n             style=\"width: ".concat(pattern.wastePercentage, "%\" \n             title=\"Chute: ").concat(UIUtils.formatLenght(pattern.waste), " mm\">\n          ").concat(showWasteText ? UIUtils.formatLenght(pattern.waste) : '', "\n        </div>\n      ");
    }
    return "\n      <div class=\"cut-scheme\">\n        <div class=\"cut-scheme-header\">\n          <strong>".concat(pattern.count, "\xD7 Sch\xE9ma #").concat(index + 1, "</strong>\n          <span>Barre m\xE8re <span class=\"bar-length-badge\">").concat(UIUtils.formatLenght(pattern.barLength), " mm</span></span>\n        </div>\n        <div class=\"cut-pieces\">\n          Pi\xE8ces: ").concat(cutsHtml, "\n        </div>\n        <div class=\"waste\">\n          Chute: <span class=\"waste-value\">").concat(UIUtils.formatLenght(pattern.waste), " mm</span>\n        </div>\n        <div class=\"cut-bar\">\n          ").concat(visualBarHtml, "\n        </div>\n      </div>\n    ");
  }
};
;// ./src/js/ui-controller.js
function ui_controller_typeof(o) { "@babel/helpers - typeof"; return ui_controller_typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, ui_controller_typeof(o); }
var _UIController;
function ui_controller_toConsumableArray(r) { return ui_controller_arrayWithoutHoles(r) || ui_controller_iterableToArray(r) || ui_controller_unsupportedIterableToArray(r) || ui_controller_nonIterableSpread(); }
function ui_controller_nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function ui_controller_iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function ui_controller_arrayWithoutHoles(r) { if (Array.isArray(r)) return ui_controller_arrayLikeToArray(r); }
function ui_controller_ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function ui_controller_objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ui_controller_ownKeys(Object(t), !0).forEach(function (r) { ui_controller_defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ui_controller_ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function ui_controller_defineProperty(e, r, t) { return (r = ui_controller_toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function ui_controller_toPropertyKey(t) { var i = ui_controller_toPrimitive(t, "string"); return "symbol" == ui_controller_typeof(i) ? i : i + ""; }
function ui_controller_toPrimitive(t, r) { if ("object" != ui_controller_typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != ui_controller_typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function ui_controller_slicedToArray(r, e) { return ui_controller_arrayWithHoles(r) || ui_controller_iterableToArrayLimit(r, e) || ui_controller_unsupportedIterableToArray(r, e) || ui_controller_nonIterableRest(); }
function ui_controller_nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function ui_controller_iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function ui_controller_arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function ui_controller_createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = ui_controller_unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function ui_controller_unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return ui_controller_arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? ui_controller_arrayLikeToArray(r, a) : void 0; } }
function ui_controller_arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function ui_controller_regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return ui_controller_regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (ui_controller_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, ui_controller_regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, ui_controller_regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), ui_controller_regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", ui_controller_regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), ui_controller_regeneratorDefine2(u), ui_controller_regeneratorDefine2(u, o, "Generator"), ui_controller_regeneratorDefine2(u, n, function () { return this; }), ui_controller_regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (ui_controller_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function ui_controller_regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } ui_controller_regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { ui_controller_regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, ui_controller_regeneratorDefine2(e, r, n, t); }
function ui_controller_asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function ui_controller_asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { ui_controller_asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { ui_controller_asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
 // MODIFIÉ: Import direct











/**
 * Contrôleur d'interface utilisateur principal (ADAPTÉ SANS ID)
 */
var UIController = (_UIController = {
  // Services et gestionnaires
  dataManager: null,
  algorithmService: null,
  importManager: null,
  F4CGenerator: null,
  F4CManager: null,
  // Gestionnaires UI
  importHandler: null,
  editHandler: null,
  // MODIFIÉ: Sera maintenant EditController
  resultsHandler: null,
  notificationService: null,
  // État de l'application
  currentResults: null,
  currentF4CObjects: null,
  // NOUVEAU: Sauvegarde de l'état original des données
  originalDataState: null,
  /**
   * NOUVEAU: Initialise le thème au chargement
   */
  initializeTheme: function initializeTheme() {
    // MODIFIÉ: Ne plus utiliser localStorage, toujours partir du système
    var systemTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    console.log("\uD83D\uDDA5\uFE0F Initialisation avec le th\xE8me syst\xE8me: ".concat(systemTheme));
    this.applyTheme(systemTheme);
    console.log('🎨 Thème initialisé selon le système');
  },
  /**
   * NOUVEAU: Applique un thème spécifique
   */
  applyTheme: function applyTheme(theme) {
    var html = document.documentElement;
    console.log("\uD83C\uDFA8 Application du th\xE8me: ".concat(theme));

    // MODIFIÉ: Utiliser des classes au lieu de color-scheme
    if (theme === 'dark') {
      html.classList.add('dark-theme');
      html.classList.remove('light-theme');
    } else {
      html.classList.add('light-theme');
      html.classList.remove('dark-theme');
    }
    console.log("\u2705 Th\xE8me ".concat(theme, " appliqu\xE9"));
  },
  /**
   * NOUVEAU: Détecte si le mode sombre est actif
   */
  isDarkMode: function isDarkMode() {
    // MODIFIÉ: Ne plus vérifier localStorage, toujours utiliser les classes appliquées ou le système
    var html = document.documentElement;

    // Vérifier si une classe de thème est appliquée
    if (html.classList.contains('dark-theme')) {
      return true;
    } else if (html.classList.contains('light-theme')) {
      return false;
    }

    // Sinon, utiliser la préférence système
    if (window.matchMedia) {
      var systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches;
      console.log("\uD83C\uDFA8 Pr\xE9f\xE9rence syst\xE8me: ".concat(systemPreference ? 'dark' : 'light'));
      return systemPreference;
    }
    console.log('🎨 Par défaut: light');
    return false;
  },
  /**
   * NOUVEAU: Bascule entre les thèmes
   */
  toggleTheme: function toggleTheme() {
    var currentTheme = this.isDarkMode() ? 'light' : 'dark';
    console.log("\uD83C\uDFA8 Basculement manuel vers: ".concat(currentTheme));

    // SUPPRIMÉ: Ne plus sauvegarder la préférence utilisateur
    // localStorage.setItem('theme', currentTheme);
    console.log("\uD83D\uDD04 Basculement temporaire vers: ".concat(currentTheme));

    // Appliquer le thème
    this.applyTheme(currentTheme);

    // Mettre à jour le toggle
    this.updateThemeToggleState();
    console.log("\u2705 Th\xE8me bascul\xE9 temporairement vers: ".concat(currentTheme));
  },
  /**
   * NOUVEAU: Met à jour l'état visuel du toggle
   */
  updateThemeToggleState: function updateThemeToggleState() {
    var themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) {
      console.warn('⚠️ Impossible de mettre à jour le toggle (élément non trouvé)');
      return;
    }
    var isDarkMode = this.isDarkMode();
    console.log("\uD83C\uDFA8 Mise \xE0 jour du toggle vers: ".concat(isDarkMode ? 'dark' : 'light'));
    if (isDarkMode) {
      themeToggle.classList.add('dark');
    } else {
      themeToggle.classList.remove('dark');
    }
  },
  /**
   * NOUVEAU: Initialise l'état du toggle de thème
   */
  initializeThemeToggle: function initializeThemeToggle() {
    console.log('🎨 Initialisation de l\'état du toggle');
    this.updateThemeToggleState();
  },
  /**
   * NOUVEAU: Configure le toggle de thème
   */
  setupThemeToggle: function setupThemeToggle() {
    var _this = this;
    var themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      console.log('🎨 Configuration du toggle de thème');

      // Initialiser l'état du toggle selon le thème actuel
      this.initializeThemeToggle();

      // MODIFIÉ: Toggle qui bascule toujours entre les modes mais reste synchronisé au système
      themeToggle.addEventListener('click', function (event) {
        console.log('🎨 Toggle de thème cliqué !');
        event.preventDefault();
        event.stopPropagation();
        _this.toggleTheme();
      });

      // MODIFIÉ: Toujours synchroniser avec le système, même s'il y a une préférence stockée
      if (window.matchMedia) {
        var mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', function (e) {
          console.log('🎨 Préférence système changée vers:', e.matches ? 'dark' : 'light');

          // NOUVEAU: Toujours suivre le système, peu importe les préférences stockées
          var newTheme = e.matches ? 'dark' : 'light';
          console.log("\uD83D\uDD04 Synchronisation automatique vers: ".concat(newTheme));

          // Appliquer le nouveau thème
          _this.applyTheme(newTheme);

          // Mettre à jour le toggle pour refléter le changement
          _this.updateThemeToggleState();

          // Notification discrète
          if (_this.showNotification) {
            _this.showNotification("Mode ".concat(newTheme === 'dark' ? 'sombre' : 'clair', " (syst\xE8me)"), 'info');
          }
        });
      }
      console.log('✅ Toggle de thème configuré avec synchronisation automatique permanente');
    } else {
      console.warn('⚠️ Élément theme-toggle non trouvé');
    }
  },
  /**
   * NOUVEAU: Méthode pour réinitialiser et suivre les préférences système
   */
  resetToSystemTheme: function resetToSystemTheme() {
    console.log('🔄 Réinitialisation vers les préférences système');

    // Supprimer la préférence stockée
    localStorage.removeItem('theme');

    // Détecter et appliquer le thème système actuel
    var systemTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    console.log("\uD83D\uDDA5\uFE0F Th\xE8me syst\xE8me d\xE9tect\xE9: ".concat(systemTheme));

    // Appliquer le thème système
    this.applyTheme(systemTheme);

    // Mettre à jour le toggle
    this.updateThemeToggleState();
    if (this.showNotification) {
      this.showNotification('Synchronisation automatique avec le système activée', 'info');
    }
    console.log('✅ Synchronisation système activée');
  }
}, ui_controller_defineProperty(ui_controller_defineProperty(ui_controller_defineProperty(ui_controller_defineProperty(ui_controller_defineProperty(ui_controller_defineProperty(ui_controller_defineProperty(ui_controller_defineProperty(ui_controller_defineProperty(ui_controller_defineProperty(_UIController, "initializeThemeToggle", function initializeThemeToggle() {
  console.log('🎨 Initialisation de l\'état du toggle');
  this.updateThemeToggleState();
}), "setupThemeToggle", function setupThemeToggle() {
  var _this2 = this;
  var themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    console.log('🎨 Configuration du toggle de thème');

    // Initialiser l'état du toggle selon le thème actuel
    this.initializeThemeToggle();

    // MODIFIÉ: Toggle qui bascule toujours entre les modes mais reste synchronisé au système
    themeToggle.addEventListener('click', function (event) {
      console.log('🎨 Toggle de thème cliqué !');
      event.preventDefault();
      event.stopPropagation();
      _this2.toggleTheme();
    });

    // MODIFIÉ: Toujours synchroniser avec le système, même s'il y a une préférence stockée
    if (window.matchMedia) {
      var mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', function (e) {
        console.log('🎨 Préférence système changée vers:', e.matches ? 'dark' : 'light');

        // NOUVEAU: Toujours suivre le système, peu importe les préférences stockées
        var newTheme = e.matches ? 'dark' : 'light';
        console.log("\uD83D\uDD04 Synchronisation automatique vers: ".concat(newTheme));

        // Appliquer le nouveau thème
        _this2.applyTheme(newTheme);

        // Mettre à jour le toggle pour refléter le changement
        _this2.updateThemeToggleState();

        // Notification discrète
        if (_this2.showNotification) {
          _this2.showNotification("Mode ".concat(newTheme === 'dark' ? 'sombre' : 'clair', " (syst\xE8me)"), 'info');
        }
      });
    }
    console.log('✅ Toggle de thème configuré avec synchronisation automatique permanente');
  } else {
    console.warn('⚠️ Élément theme-toggle non trouvé');
  }
}), "setupEditDataButton", function setupEditDataButton() {
  var _this3 = this;
  var editDataBtn = document.getElementById('edit-data-btn');
  if (editDataBtn) {
    editDataBtn.addEventListener('click', function () {
      console.log('🔄 Retour à l\'édition des données');
      _this3.showSection('data-section');
    });
  }
}), "setupEventListeners", function setupEventListeners() {
  var _this4 = this;
  try {
    console.log('Configuration des gestionnaires d\'événements...');

    // Configurer le bouton d'optimisation
    var setupOptimizeButton = function setupOptimizeButton() {
      var optimizeBtn = document.getElementById('generate-cuts-btn');
      if (optimizeBtn) {
        optimizeBtn.addEventListener('click', function () {
          _this4.runOptimization();
        });
      }
    };

    // Configurer les boutons
    setupOptimizeButton();

    // Configuration du bouton "Éditer les Données"
    this.setupEditDataButton();

    // NOUVEAU: Configuration du toggle de thème
    this.setupThemeToggle();
    console.log('Gestionnaires d\'événements configurés');
  } catch (error) {
    console.error('Erreur lors de la configuration des événements:', error);
  }
}), "init", function () {
  var _init = ui_controller_asyncToGenerator(/*#__PURE__*/ui_controller_regenerator().m(function _callee() {
    var _t;
    return ui_controller_regenerator().w(function (_context) {
      while (1) switch (_context.p = _context.n) {
        case 0:
          _context.p = 0;
          console.log('🚀 Initialisation de l\'application...');

          // NOUVEAU: Initialiser le thème en premier
          this.initializeTheme();

          // Initialiser les services principaux
          this.initializeServices();

          // Initialiser les gestionnaires UI
          _context.n = 1;
          return this.initializeUIHandlers();
        case 1:
          // Configurer les gestionnaires d'événements
          this.setupEventListeners();
          console.log('✅ Application initialisée avec succès');
          _context.n = 3;
          break;
        case 2:
          _context.p = 2;
          _t = _context.v;
          console.error('❌ Erreur lors de l\'initialisation:', _t);
          this.showNotification('Erreur lors de l\'initialisation de l\'application', 'error');
        case 3:
          return _context.a(2);
      }
    }, _callee, this, [[0, 2]]);
  }));
  function init() {
    return _init.apply(this, arguments);
  }
  return init;
}()), "initializeServices", function initializeServices() {
  // Initialiser le service de notification en premier
  this.notificationService = NotificationService;
  this.notificationService.init();

  // Initialiser les autres services
  this.dataManager = DataManager;
  this.algorithmService = AlgorithmService; // Plus besoin d'init car import direct
  this.importManager = ImportManager;
  this.F4CGenerator = F4CGenerator;
  this.F4CManager = F4CManager;

  // NOUVEAU: Initialiser les données (chargement automatique du localStorage)
  this.dataManager.initData();
  console.log('📋 Services principaux initialisés');
}), "initializeUIHandlers", function () {
  var _initializeUIHandlers = ui_controller_asyncToGenerator(/*#__PURE__*/ui_controller_regenerator().m(function _callee2() {
    var _this5 = this;
    var _t2;
    return ui_controller_regenerator().w(function (_context2) {
      while (1) switch (_context2.p = _context2.n) {
        case 0:
          _context2.p = 0;
          // Initialiser les gestionnaires avec leurs dépendances
          this.importHandler = ImportHandler;
          this.importHandler.init({
            importManager: this.importManager,
            dataManager: this.dataManager,
            showNotification: function showNotification(msg, type) {
              return _this5.showNotification(msg, type);
            },
            refreshDataDisplay: function refreshDataDisplay() {
              return _this5.refreshDataDisplay();
            }
          });

          // MODIFIÉ: Utiliser EditController directement
          this.editHandler = EditController;
          this.editHandler.init({
            dataManager: this.dataManager,
            showNotification: function showNotification(msg, type) {
              return _this5.showNotification(msg, type);
            },
            refreshDataDisplay: function refreshDataDisplay() {
              return _this5.refreshDataDisplay();
            }
          });
          this.resultsHandler = ResultsHandler;
          this.resultsHandler.init({
            F4CGenerator: this.F4CGenerator,
            dataManager: this.dataManager,
            uiController: this,
            showNotification: function showNotification(msg, type) {
              return _this5.showNotification(msg, type);
            }
          });

          // Rendre les sections d'édition après initialisation
          this.editHandler.renderSection();
          console.log('🎨 Gestionnaires UI initialisés');
          _context2.n = 2;
          break;
        case 1:
          _context2.p = 1;
          _t2 = _context2.v;
          console.error('❌ Erreur lors de l\'initialisation des gestionnaires UI:', _t2);
          throw _t2;
        case 2:
          return _context2.a(2);
      }
    }, _callee2, this, [[0, 1]]);
  }));
  function initializeUIHandlers() {
    return _initializeUIHandlers.apply(this, arguments);
  }
  return initializeUIHandlers;
}()), "showNotification", function showNotification(message) {
  var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'info';
  if (this.notificationService && this.notificationService.show) {
    this.notificationService.show(message, type);
  } else {
    // Fallback en cas de problème avec le service de notification
    console.log("[".concat(type.toUpperCase(), "] ").concat(message));
  }
}), "refreshDataDisplay", function refreshDataDisplay() {
  try {
    if (this.editHandler && this.editHandler.refreshTables) {
      this.editHandler.refreshTables();
    }

    // Mettre à jour les compteurs s'ils existent
    this.updateDataCounters();
  } catch (error) {
    console.error('❌ Erreur lors du rafraîchissement de l\'affichage:', error);
  }
}), "updateDataCounters", function updateDataCounters() {
  try {
    var data = this.dataManager.getData();

    // Compter les pièces
    var totalPieces = 0;
    for (var profile in data.pieces) {
      var _iterator = ui_controller_createForOfIteratorHelper(data.pieces[profile]),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var piece = _step.value;
          totalPieces += piece.quantity;
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    }

    // Compter les barres mères
    var totalMotherBars = 0;
    for (var _profile in data.motherBars) {
      var _iterator2 = ui_controller_createForOfIteratorHelper(data.motherBars[_profile]),
        _step2;
      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var bar = _step2.value;
          totalMotherBars += bar.quantity;
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }
    }

    // Mettre à jour l'interface si les éléments existent
    var piecesCounter = document.getElementById('pieces-counter');
    var mothersCounter = document.getElementById('mothers-counter');
    if (piecesCounter) {
      piecesCounter.textContent = totalPieces;
    }
    if (mothersCounter) {
      mothersCounter.textContent = totalMotherBars;
    }
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour des compteurs:', error);
  }
}), ui_controller_defineProperty(ui_controller_defineProperty(ui_controller_defineProperty(ui_controller_defineProperty(ui_controller_defineProperty(ui_controller_defineProperty(ui_controller_defineProperty(ui_controller_defineProperty(ui_controller_defineProperty(ui_controller_defineProperty(_UIController, "getCurrentF4CObjects", function getCurrentF4CObjects() {
  return this.currentF4CObjects;
}), "showSection", function showSection(sectionName) {
  // MODIFIÉ: Restaurer les données originales quand on retourne à l'édition
  if (sectionName === 'data-section') {
    this.restoreOriginalDataState();
    this.clearOptimizationResults();
    console.log('🔄 Données originales restaurées lors du retour à l\'édition');
  }

  // Cacher toutes les sections
  var sections = document.querySelectorAll('.content-section');
  sections.forEach(function (section) {
    section.classList.remove('active');
  });

  // Afficher la section demandée
  var targetSection = document.getElementById(sectionName);
  if (targetSection) {
    targetSection.classList.add('active');
  }

  // MODIFIÉ: Gérer l'affichage de la navigation avec le toggle
  var editDataBtn = document.getElementById('edit-data-btn');
  var themeToggleContainer = document.getElementById('theme-toggle-container');
  if (sectionName === 'result-section') {
    // Page résultats : afficher le bouton "Éditer les Données", masquer le toggle
    if (editDataBtn) {
      editDataBtn.style.display = 'flex';
    }
    if (themeToggleContainer) {
      themeToggleContainer.style.display = 'none';
    }
  } else {
    // Page données : masquer le bouton "Éditer les Données", afficher le toggle
    if (editDataBtn) {
      editDataBtn.style.display = 'none';
    }
    if (themeToggleContainer) {
      themeToggleContainer.style.display = 'flex';
    }

    // MODIFIÉ: Vérifier et rafraîchir l'affichage des données
    if (sectionName === 'data-section') {
      this.verifyAndRefreshDataDisplay();
    }
  }
}), "saveOriginalDataState", function saveOriginalDataState() {
  try {
    var currentData = this.dataManager.getData();

    // CORRIGÉ: Plus de barsList, seulement pieces et motherBars
    this.originalDataState = {
      pieces: JSON.parse(JSON.stringify(currentData.pieces)),
      motherBars: JSON.parse(JSON.stringify(currentData.motherBars))
    };
    console.log('💾 État original des données sauvegardé');

    // Log des données sauvegardées pour le débogage
    var totalPieces = 0;
    for (var profile in this.originalDataState.pieces) {
      var _iterator3 = ui_controller_createForOfIteratorHelper(this.originalDataState.pieces[profile]),
        _step3;
      try {
        for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
          var piece = _step3.value;
          totalPieces += piece.quantity;
        }
      } catch (err) {
        _iterator3.e(err);
      } finally {
        _iterator3.f();
      }
    }
    var totalMotherBars = 0;
    for (var _profile2 in this.originalDataState.motherBars) {
      var _iterator4 = ui_controller_createForOfIteratorHelper(this.originalDataState.motherBars[_profile2]),
        _step4;
      try {
        for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
          var bar = _step4.value;
          totalMotherBars += bar.quantity;
        }
      } catch (err) {
        _iterator4.e(err);
      } finally {
        _iterator4.f();
      }
    }
    console.log("    \uD83D\uDCE6 Sauvegard\xE9: ".concat(totalPieces, " pi\xE8ces, ").concat(totalMotherBars, " barres m\xE8res"));
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde de l\'état original:', error);
  }
}), "restoreOriginalDataState", function restoreOriginalDataState() {
  try {
    if (!this.originalDataState) {
      console.warn('⚠️ Aucun état original à restaurer');
      return;
    }

    // CORRIGÉ: Restaurer seulement pieces et motherBars
    this.dataManager.data.pieces = JSON.parse(JSON.stringify(this.originalDataState.pieces));
    this.dataManager.data.motherBars = JSON.parse(JSON.stringify(this.originalDataState.motherBars));
    console.log('🔄 État original des données restauré');

    // Log des données restaurées pour le débogage
    var totalPieces = 0;
    for (var profile in this.dataManager.data.pieces) {
      var _iterator5 = ui_controller_createForOfIteratorHelper(this.dataManager.data.pieces[profile]),
        _step5;
      try {
        for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
          var piece = _step5.value;
          totalPieces += piece.quantity;
        }
      } catch (err) {
        _iterator5.e(err);
      } finally {
        _iterator5.f();
      }
    }
    var totalMotherBars = 0;
    for (var _profile3 in this.dataManager.data.motherBars) {
      var _iterator6 = ui_controller_createForOfIteratorHelper(this.dataManager.data.motherBars[_profile3]),
        _step6;
      try {
        for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
          var bar = _step6.value;
          totalMotherBars += bar.quantity;
        }
      } catch (err) {
        _iterator6.e(err);
      } finally {
        _iterator6.f();
      }
    }
    console.log("    \u2705 Restaur\xE9: ".concat(totalPieces, " pi\xE8ces, ").concat(totalMotherBars, " barres m\xE8res"));
  } catch (error) {
    console.error('❌ Erreur lors de la restauration de l\'état original:', error);
    // En cas d'erreur, essayer de réinitialiser
    this.dataManager.initData();
  }
}), "displayCuttingSchemesInConsole", function displayCuttingSchemesInConsole(results) {
  var _results$globalStats, _results$globalStats2;
  console.log('\n🎯 ===== SCHÉMAS DE COUPE RETENUS =====');
  var modelResults = results.modelResults || {};
  for (var _i = 0, _Object$entries = Object.entries(modelResults); _i < _Object$entries.length; _i++) {
    var _Object$entries$_i = ui_controller_slicedToArray(_Object$entries[_i], 2),
      modelKey = _Object$entries$_i[0],
      modelResult = _Object$entries$_i[1];
    console.log("\n\uD83D\uDCCB Mod\xE8le: ".concat(modelKey));
    console.log('─'.repeat(50));
    var layouts = modelResult.layouts || [];
    if (layouts.length === 0) {
      console.log('  Aucun schéma de coupe');
      continue;
    }
    layouts.forEach(function (layout, index) {
      var cuts = layout.cuts || layout.pieces || [];
      var count = layout.count || 1;
      var waste = layout.waste || layout.remainingLength || 0;
      var barLength = layout.originalLength || 0;

      // Grouper les coupes par longueur
      var cutCounts = {};
      cuts.forEach(function (cut) {
        cutCounts[cut] = (cutCounts[cut] || 0) + 1;
      });

      // Formater les coupes
      var cutsDisplay = Object.entries(cutCounts).sort(function (a, b) {
        return parseInt(b[0]) - parseInt(a[0]);
      }) // Trier par longueur décroissante
      .map(function (_ref) {
        var _ref2 = ui_controller_slicedToArray(_ref, 2),
          length = _ref2[0],
          count = _ref2[1];
        return "".concat(count, "\xD7").concat(length, "mm");
      }).join(' + ');

      // Calculer l'efficacité
      var usedLength = cuts.reduce(function (sum, cut) {
        return sum + cut;
      }, 0);
      var efficiency = barLength > 0 ? (usedLength / barLength * 100).toFixed(1) : 0;
      console.log("  Sch\xE9ma #".concat(index + 1, ": ").concat(count, "\xD7 r\xE9p\xE9tition(s)"));
      console.log("    \u2514\u2500 Barre ".concat(barLength, "mm: ").concat(cutsDisplay));
      console.log("    \u2514\u2500 Chute: ".concat(waste, "mm | Efficacit\xE9: ").concat(efficiency, "%"));
    });

    // Statistiques du modèle
    var totalBars = layouts.reduce(function (sum, layout) {
      return sum + (layout.count || 1);
    }, 0);
    var totalWaste = layouts.reduce(function (sum, layout) {
      return sum + (layout.count || 1) * (layout.waste || 0);
    }, 0);
    var totalLength = layouts.reduce(function (sum, layout) {
      return sum + (layout.count || 1) * (layout.originalLength || 0);
    }, 0);
    var globalEfficiency = totalLength > 0 ? ((totalLength - totalWaste) / totalLength * 100).toFixed(1) : 0;
    console.log("\n  \uD83D\uDCCA R\xE9sum\xE9 ".concat(modelKey, ":"));
    console.log("    \u2022 ".concat(totalBars, " barres m\xE8res utilis\xE9es"));
    console.log("    \u2022 ".concat(totalWaste, "mm de chutes au total"));
    console.log("    \u2022 ".concat(globalEfficiency, "% d'efficacit\xE9 globale"));
  }

  // Statistiques globales
  var globalStats = ((_results$globalStats = results.globalStats) === null || _results$globalStats === void 0 ? void 0 : _results$globalStats.statistics) || {};
  console.log("\n\uD83C\uDFC6 R\xC9SUM\xC9 GLOBAL:");
  console.log("  \u2022 Total barres utilis\xE9es: ".concat(((_results$globalStats2 = results.globalStats) === null || _results$globalStats2 === void 0 ? void 0 : _results$globalStats2.totalBarsUsed) || 0));
  console.log("  \u2022 Efficacit\xE9 globale: ".concat(globalStats.utilizationRate || 0, "%"));
  console.log("  \u2022 Algorithme utilis\xE9: ".concat(results.bestAlgorithm === 'ffd' ? 'First-Fit Decreasing' : 'Programmation Linéaire'));
  if (results.comparison) {
    console.log("  \u2022 Comparaison: FFD ".concat(results.comparison.ffdEfficiency, "% vs ILP ").concat(results.comparison.ilpEfficiency, "%"));
  }
  console.log('🎯 =====================================\n');
}), "logDataStatistics", function logDataStatistics(data) {
  console.log('📊 === STATISTIQUES DES DONNÉES ===');

  // Compter les pièces
  var totalPieces = 0;
  var pieceProfiles = 0;
  var totalPieceTypes = 0;
  for (var profile in data.pieces) {
    pieceProfiles++;
    var profilePieces = data.pieces[profile];
    var profileTotal = profilePieces.reduce(function (sum, piece) {
      return sum + piece.quantity;
    }, 0);
    totalPieces += profileTotal;
    totalPieceTypes += profilePieces.length;
    console.log("  \uD83D\uDD27 ".concat(profile, ": ").concat(profilePieces.length, " types, ").concat(profileTotal, " pi\xE8ces"));
  }

  // Compter les barres mères
  var totalMotherBars = 0;
  var motherProfiles = 0;
  var totalMotherTypes = 0;
  for (var _profile4 in data.motherBars) {
    motherProfiles++;
    var profileBars = data.motherBars[_profile4];
    var _profileTotal = profileBars.reduce(function (sum, bar) {
      return sum + bar.quantity;
    }, 0);
    totalMotherBars += _profileTotal;
    totalMotherTypes += profileBars.length;
    console.log("  \uD83D\uDCCF ".concat(_profile4, ": ").concat(profileBars.length, " longueurs, ").concat(_profileTotal, " barres"));
  }
  console.log("\uD83D\uDCCB Total: ".concat(totalPieces, " pi\xE8ces (").concat(totalPieceTypes, " types), ").concat(totalMotherBars, " barres m\xE8res (").concat(totalMotherTypes, " types)"));
  console.log("\uD83D\uDCC1 Profils: ".concat(pieceProfiles, " pour pi\xE8ces, ").concat(motherProfiles, " pour barres"));
  console.log('📊 =====================================');
}), "checkDataIntegrity", function checkDataIntegrity() {
  var data = this.dataManager.getData();

  // CORRIGÉ: Vérifier seulement que les structures de base existent
  if (!data.pieces || !data.motherBars) {
    console.warn('⚠️ Structure de données corrompue, réinitialisation...');
    this.dataManager.initData();
    return false;
  }

  // NOUVEAU: Vérifications de cohérence interne
  for (var profile in data.pieces) {
    if (!Array.isArray(data.pieces[profile])) {
      console.warn("\u26A0\uFE0F Structure pieces[".concat(profile, "] corrompue"));
      return false;
    }

    // Vérifier chaque pièce
    var _iterator7 = ui_controller_createForOfIteratorHelper(data.pieces[profile]),
      _step7;
    try {
      for (_iterator7.s(); !(_step7 = _iterator7.n()).done;) {
        var piece = _step7.value;
        if (!piece.profile || !piece.length || !piece.quantity) {
          console.warn("\u26A0\uFE0F Pi\xE8ce invalide dans ".concat(profile, ":"), piece);
          return false;
        }
      }
    } catch (err) {
      _iterator7.e(err);
    } finally {
      _iterator7.f();
    }
  }
  for (var _profile5 in data.motherBars) {
    if (!Array.isArray(data.motherBars[_profile5])) {
      console.warn("\u26A0\uFE0F Structure motherBars[".concat(_profile5, "] corrompue"));
      return false;
    }

    // Vérifier chaque barre mère
    var _iterator8 = ui_controller_createForOfIteratorHelper(data.motherBars[_profile5]),
      _step8;
    try {
      for (_iterator8.s(); !(_step8 = _iterator8.n()).done;) {
        var bar = _step8.value;
        if (!bar.profile || !bar.length || !bar.quantity) {
          console.warn("\u26A0\uFE0F Barre m\xE8re invalide dans ".concat(_profile5, ":"), bar);
          return false;
        }
      }
    } catch (err) {
      _iterator8.e(err);
    } finally {
      _iterator8.f();
    }
  }
  console.log('✅ Intégrité des données vérifiée');
  return true;
}), "getTotalDataElements", function getTotalDataElements() {
  var data = this.dataManager.getData();
  var totalElements = 0;

  // Compter les types de pièces
  for (var profile in data.pieces) {
    totalElements += data.pieces[profile].length;
  }

  // Compter les types de barres mères  
  for (var _profile6 in data.motherBars) {
    totalElements += data.motherBars[_profile6].length;
  }
  return totalElements;
}), "verifyAndRefreshDataDisplay", function verifyAndRefreshDataDisplay() {
  try {
    console.log('🔍 Vérification de l\'intégrité des données...');

    // Obtenir les données actuelles
    var data = this.dataManager.getData();

    // Afficher les statistiques de débogage
    this.logDataStatistics(data);

    // Vérifier l'intégrité
    if (!this.checkDataIntegrity()) {
      console.log('🔧 Données corrigées automatiquement');
    } else {
      console.log("\u2705 ".concat(this.getTotalDataElements(), " \xE9l\xE9ments de donn\xE9es valid\xE9s"));
    }

    // Rafraîchir l'affichage
    this.refreshDataDisplay();
    console.log('🔄 Vérification et rafraîchissement terminés');
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
    // En cas d'erreur critique, ne pas réinitialiser les données
    this.showNotification('Erreur lors de la vérification des données', 'warning');
  }
}), "runOptimization", function () {
  var _runOptimization = ui_controller_asyncToGenerator(/*#__PURE__*/ui_controller_regenerator().m(function _callee3() {
    var data, progress, models, allResults, finalResults, _t3;
    return ui_controller_regenerator().w(function (_context3) {
      while (1) switch (_context3.p = _context3.n) {
        case 0:
          _context3.p = 0;
          this.saveOriginalDataState();
          this.clearOptimizationResults();
          data = this.dataManager.getData();
          console.log('🔍 Vérification des données avant optimisation...');
          this.logDataStatistics(data);
          if (this.validateDataForOptimization(data)) {
            _context3.n = 1;
            break;
          }
          return _context3.a(2);
        case 1:
          UIUtils.showLoadingOverlay();
          progress = document.querySelector('#loading-overlay .loading-progress');
          if (progress) progress.style.display = 'none';

          // === 1. CRÉATION DES MODÈLES ===
          // Création des modèles AVANT génération des étapes
          models = this.algorithmService.createModelsFromDataManager();
          console.log("\uD83D\uDCCB ".concat(models.length, " mod\xE8les cr\xE9\xE9s"));

          // === 2. GÉNÉRATION DES ÉTAPES ===
          this.generateExecutionSteps(models);

          // === 3. ÉTAPE TRANSFORM ===
          _context3.n = 2;
          return this.activateStep('step-transform', 'Préparation des modèles...');
        case 2:
          _context3.n = 3;
          return new Promise(function (resolve) {
            return setTimeout(resolve, 500);
          });
        case 3:
          _context3.n = 4;
          return this.completeStep('step-transform', 'Modèles prêts');
        case 4:
          _context3.n = 5;
          return this.runRealAlgorithmSteps(models);
        case 5:
          allResults = _context3.v;
          _context3.n = 6;
          return this.runFinalComparison(allResults);
        case 6:
          finalResults = _context3.v;
          this.currentResults = finalResults;

          // === 6. GÉNÉRATION DES F4C ===
          _context3.n = 7;
          return this.runF4CGenerationStep();
        case 7:
          _context3.n = 8;
          return new Promise(function (resolve) {
            return setTimeout(resolve, 400);
          });
        case 8:
          this.showResultsTabs();
          _context3.n = 10;
          break;
        case 9:
          _context3.p = 9;
          _t3 = _context3.v;
          console.error('Erreur lors de l\'optimisation:', _t3);
          this.showNotification("Erreur: ".concat(_t3.message), 'error');
          this.restoreOriginalDataState();
          this.clearOptimizationResults();
        case 10:
          _context3.p = 10;
          UIUtils.hideLoadingOverlay();
          UIUtils.showLoadingProgressBar();
          return _context3.f(10);
        case 11:
          return _context3.a(2);
      }
    }, _callee3, this, [[0, 9, 10, 11]]);
  }));
  function runOptimization() {
    return _runOptimization.apply(this, arguments);
  }
  return runOptimization;
}()), ui_controller_defineProperty(ui_controller_defineProperty(ui_controller_defineProperty(ui_controller_defineProperty(ui_controller_defineProperty(ui_controller_defineProperty(ui_controller_defineProperty(ui_controller_defineProperty(ui_controller_defineProperty(ui_controller_defineProperty(_UIController, "generateExecutionSteps", function generateExecutionSteps(models) {
  var _this6 = this;
  var stepsContainer = document.querySelector('#loading-overlay .loading-steps');
  if (!stepsContainer) return;
  stepsContainer.innerHTML = '';
  var stepNum = 1;

  // Étape 1 : Création des modèles
  stepsContainer.appendChild(this.createStepDiv('step-transform', stepNum++, 'Préparation des modèles'));

  // Une étape par modèle (FFD + ILP combinés)
  models.forEach(function (model, modelIndex) {
    var modelLabel = model.label;
    stepsContainer.appendChild(_this6.createStepDiv("step-model-".concat(modelIndex), stepNum++, "Optimisation: ".concat(modelLabel)));
  });

  // Étapes finales
  stepsContainer.appendChild(this.createStepDiv('step-compare', stepNum++, 'Comparaison et sélection'));
  stepsContainer.appendChild(this.createStepDiv('step-F4C', stepNum++, 'Génération des fichiers F4C'));
  console.log("\uD83C\uDFAF ".concat(stepNum - 1, " \xE9tapes g\xE9n\xE9r\xE9es pour ").concat(models.length, " mod\xE8les"));
}), "activateStep", function () {
  var _activateStep = ui_controller_asyncToGenerator(/*#__PURE__*/ui_controller_regenerator().m(function _callee4(stepId, message) {
    var step;
    return ui_controller_regenerator().w(function (_context4) {
      while (1) switch (_context4.n) {
        case 0:
          step = document.getElementById(stepId);
          if (!step) {
            _context4.n = 1;
            break;
          }
          // Marquer comme actif
          step.classList.add('active');
          step.classList.remove('completed');

          // Petite pause pour l'effet visuel
          _context4.n = 1;
          return new Promise(function (resolve) {
            return setTimeout(resolve, 200);
          });
        case 1:
          console.log("\uD83D\uDFE1 \xC9tape ".concat(stepId, " activ\xE9e: ").concat(message));
        case 2:
          return _context4.a(2);
      }
    }, _callee4);
  }));
  function activateStep(_x, _x2) {
    return _activateStep.apply(this, arguments);
  }
  return activateStep;
}()), "completeStep", function () {
  var _completeStep = ui_controller_asyncToGenerator(/*#__PURE__*/ui_controller_regenerator().m(function _callee5(stepId, message) {
    var step;
    return ui_controller_regenerator().w(function (_context5) {
      while (1) switch (_context5.n) {
        case 0:
          step = document.getElementById(stepId);
          if (!step) {
            _context5.n = 2;
            break;
          }
          _context5.n = 1;
          return new Promise(function (resolve) {
            return setTimeout(resolve, 300);
          });
        case 1:
          // Marquer comme complété
          step.classList.remove('active');
          step.classList.add('completed');

          // Petite pause avant l'étape suivante
          _context5.n = 2;
          return new Promise(function (resolve) {
            return setTimeout(resolve, 200);
          });
        case 2:
          console.log("\u2705 \xC9tape ".concat(stepId, " termin\xE9e: ").concat(message));
        case 3:
          return _context5.a(2);
      }
    }, _callee5);
  }));
  function completeStep(_x3, _x4) {
    return _completeStep.apply(this, arguments);
  }
  return completeStep;
}()), "runRealAlgorithmSteps", function () {
  var _runRealAlgorithmSteps = ui_controller_asyncToGenerator(/*#__PURE__*/ui_controller_regenerator().m(function _callee6(models) {
    var allResults, i, model, stepId, ffdResult, ilpResult, _ffdResult, _t4, _t5;
    return ui_controller_regenerator().w(function (_context6) {
      while (1) switch (_context6.p = _context6.n) {
        case 0:
          console.log('🚀 Exécution réelle étape par étape (version simplifiée)');
          allResults = {}; // Initialiser la structure des résultats
          models.forEach(function (model) {
            allResults[model.key] = {
              model: model,
              ffdResult: null,
              ilpResult: null
            };
          });

          // EXÉCUTION: Une étape par modèle (FFD + ILP combinés)
          i = 0;
        case 1:
          if (!(i < models.length)) {
            _context6.n = 12;
            break;
          }
          model = models[i];
          stepId = "step-model-".concat(i);
          console.log("\uD83C\uDFAF Optimisation compl\xE8te pour ".concat(model.key, " (").concat(i + 1, "/").concat(models.length, ")"));

          // ACTIVER l'étape avant l'exécution
          _context6.n = 2;
          return this.activateStep(stepId, "Optimisation de ".concat(model.label, "..."));
        case 2:
          _context6.p = 2;
          // EXÉCUTION FFD en arrière-plan
          console.log("  \uD83D\uDD04 FFD pour ".concat(model.key));
          ffdResult = this.algorithmService.runAlgorithmOnSingleModel('ffd', model);
          allResults[model.key].ffdResult = ffdResult;
          _context6.n = 3;
          return new Promise(function (resolve) {
            return setTimeout(resolve, 200);
          });
        case 3:
          // EXÉCUTION ILP en arrière-plan
          console.log("  \uD83D\uDD04 ILP pour ".concat(model.key));
          ilpResult = this.algorithmService.runAlgorithmOnSingleModel('ilp', model);
          allResults[model.key].ilpResult = ilpResult;

          // COMPLÉTER l'étape après les deux algorithmes
          _context6.n = 4;
          return this.completeStep(stepId, "".concat(model.label, " optimis\xE9"));
        case 4:
          _context6.n = 11;
          break;
        case 5:
          _context6.p = 5;
          _t4 = _context6.v;
          console.error("\u274C Erreur optimisation pour ".concat(model.key, ":"), _t4);

          // Essayer au moins un algorithme si l'autre a échoué
          if (!(!allResults[model.key].ffdResult && !allResults[model.key].ilpResult)) {
            _context6.n = 10;
            break;
          }
          _context6.p = 6;
          console.log("  \uD83D\uDD04 Tentative FFD seul pour ".concat(model.key));
          _ffdResult = this.algorithmService.runAlgorithmOnSingleModel('ffd', model);
          allResults[model.key].ffdResult = _ffdResult;
          _context6.n = 7;
          return this.completeStep(stepId, "".concat(model.label, " optimis\xE9 (FFD uniquement)"));
        case 7:
          _context6.n = 9;
          break;
        case 8:
          _context6.p = 8;
          _t5 = _context6.v;
          console.error("\u274C Erreur FFD pour ".concat(model.key, ":"), _t5);
          _context6.n = 9;
          return this.completeStep(stepId, "".concat(model.label, " - \xC9chec optimisation"));
        case 9:
          _context6.n = 11;
          break;
        case 10:
          _context6.n = 11;
          return this.completeStep(stepId, "".concat(model.label, " partiellement optimis\xE9"));
        case 11:
          i++;
          _context6.n = 1;
          break;
        case 12:
          return _context6.a(2, allResults);
      }
    }, _callee6, this, [[6, 8], [2, 5]]);
  }));
  function runRealAlgorithmSteps(_x5) {
    return _runRealAlgorithmSteps.apply(this, arguments);
  }
  return runRealAlgorithmSteps;
}()), "runFinalComparison", function () {
  var _runFinalComparison = ui_controller_asyncToGenerator(/*#__PURE__*/ui_controller_regenerator().m(function _callee7(allResults) {
    var stepCompareId, modelResults, _i2, _Object$entries2, _Object$entries2$_i, modelKey, results, ffdResult, ilpResult, bestResult, finalResults;
    return ui_controller_regenerator().w(function (_context7) {
      while (1) switch (_context7.n) {
        case 0:
          stepCompareId = 'step-compare'; // ACTIVER l'étape de comparaison
          _context7.n = 1;
          return this.activateStep(stepCompareId, 'Comparaison des algorithmes et sélection...');
        case 1:
          console.log('🔄 Comparaison finale des résultats');
          modelResults = {}; // Comparer et sélectionner pour chaque modèle
          for (_i2 = 0, _Object$entries2 = Object.entries(allResults); _i2 < _Object$entries2.length; _i2++) {
            _Object$entries2$_i = ui_controller_slicedToArray(_Object$entries2[_i2], 2), modelKey = _Object$entries2$_i[0], results = _Object$entries2$_i[1];
            ffdResult = results.ffdResult, ilpResult = results.ilpResult;
            if (ffdResult || ilpResult) {
              bestResult = this.algorithmService.selectBestForModel(modelKey, ffdResult, ilpResult);
              modelResults[modelKey] = bestResult;
            }
          }

          // Construire les résultats finaux
          finalResults = this.algorithmService.buildFinalResults(modelResults); // COMPLÉTER l'étape de comparaison
          _context7.n = 2;
          return this.completeStep(stepCompareId, 'Comparaison terminée');
        case 2:
          return _context7.a(2, finalResults);
      }
    }, _callee7, this);
  }));
  function runFinalComparison(_x6) {
    return _runFinalComparison.apply(this, arguments);
  }
  return runFinalComparison;
}()), "runF4CGenerationStep", function () {
  var _runF4CGenerationStep = ui_controller_asyncToGenerator(/*#__PURE__*/ui_controller_regenerator().m(function _callee8() {
    var stepF4CId, _t6;
    return ui_controller_regenerator().w(function (_context8) {
      while (1) switch (_context8.p = _context8.n) {
        case 0:
          stepF4CId = 'step-F4C'; // ACTIVER l'étape F4C
          _context8.n = 1;
          return this.activateStep(stepF4CId, 'Génération des fichiers F4C...');
        case 1:
          _context8.p = 1;
          // Génération réelle des F4C
          this.currentF4CObjects = this.F4CManager.generateF4CObjects(this.currentResults);
          ResultsRenderer.renderResults(this.currentResults, this.algorithmService);
          this.resultsHandler.generateF4CPreviews();

          // COMPLÉTER l'étape F4C
          _context8.n = 2;
          return this.completeStep(stepF4CId, 'Fichiers F4C générés');
        case 2:
          _context8.n = 5;
          break;
        case 3:
          _context8.p = 3;
          _t6 = _context8.v;
          console.error('❌ Erreur lors de la génération F4C:', _t6);
          _context8.n = 4;
          return this.completeStep(stepF4CId, 'Erreur génération F4C');
        case 4:
          this.showNotification('Erreur lors de la génération des aperçus F4C', 'warning');
        case 5:
          return _context8.a(2);
      }
    }, _callee8, this, [[1, 3]]);
  }));
  function runF4CGenerationStep() {
    return _runF4CGenerationStep.apply(this, arguments);
  }
  return runF4CGenerationStep;
}()), "createStepDiv", function createStepDiv(id, icon, label) {
  var div = document.createElement('div');
  div.className = 'loading-step';
  div.id = id;
  div.innerHTML = "<div class=\"step-icon\">".concat(icon, "</div><span>").concat(label, "</span>");
  return div;
}), "validateDataForOptimization", function validateDataForOptimization(data) {
  console.log('🔍 === VALIDATION DES DONNÉES ===');
  if (!data) {
    console.error('❌ Aucune donnée disponible');
    this.showNotification('Aucune donnée disponible pour l\'optimisation', 'error');
    return false;
  }
  if (!data.pieces || !data.motherBars) {
    console.error('❌ Structure de données invalide');
    this.showNotification('Structure de données corrompue', 'error');
    return false;
  }

  // Vérifier qu'il y a des pièces
  var totalPieces = 0;
  var pieceDetails = [];
  var allPieceRequirements = []; // Pour stocker les besoins de chaque pièce

  for (var profile in data.pieces) {
    var _iterator9 = ui_controller_createForOfIteratorHelper(data.pieces[profile]),
      _step9;
    try {
      for (_iterator9.s(); !(_step9 = _iterator9.n()).done;) {
        var piece = _step9.value;
        totalPieces += piece.quantity;
        pieceDetails.push("".concat(profile, ": ").concat(piece.quantity, "\xD7").concat(piece.length, "mm"));

        // Stocker les besoins pour la validation ultérieure
        allPieceRequirements.push({
          profile: piece.profile,
          length: piece.length,
          quantity: piece.quantity,
          orientation: piece.orientation || 'a-plat',
          nom: piece.nom || "".concat(profile, "_").concat(piece.length, "mm")
        });
      }
    } catch (err) {
      _iterator9.e(err);
    } finally {
      _iterator9.f();
    }
  }
  console.log("\uD83D\uDCE6 Pi\xE8ces trouv\xE9es: ".concat(totalPieces));
  if (pieceDetails.length > 0) {
    console.log('   Détail:', pieceDetails.slice(0, 5).join(', ') + (pieceDetails.length > 5 ? '...' : ''));
  }
  if (totalPieces === 0) {
    console.error('❌ Aucune pièce à découper trouvée');
    this.showNotification('Aucune pièce à découper. Veuillez d\'abord importer des barres.', 'error');
    return false;
  }

  // Vérifier qu'il y a des barres mères
  var totalMotherBars = 0;
  var motherDetails = [];
  var motherBarCapabilities = {}; // Structure: {profile: [{length: X, quantity: Y}, ...]}

  for (var _profile7 in data.motherBars) {
    if (!motherBarCapabilities[_profile7]) {
      motherBarCapabilities[_profile7] = [];
    }
    var _iterator0 = ui_controller_createForOfIteratorHelper(data.motherBars[_profile7]),
      _step0;
    try {
      for (_iterator0.s(); !(_step0 = _iterator0.n()).done;) {
        var bar = _step0.value;
        totalMotherBars += bar.quantity;
        motherDetails.push("".concat(_profile7, ": ").concat(bar.quantity, "\xD7").concat(bar.length, "mm"));
        motherBarCapabilities[_profile7].push({
          length: bar.length,
          quantity: bar.quantity
        });
      }
    } catch (err) {
      _iterator0.e(err);
    } finally {
      _iterator0.f();
    }
  }
  console.log("\uD83D\uDCCF Barres m\xE8res trouv\xE9es: ".concat(totalMotherBars));
  if (motherDetails.length > 0) {
    console.log('   Détail:', motherDetails.slice(0, 5).join(', ') + (motherDetails.length > 5 ? '...' : ''));
  }
  if (totalMotherBars === 0) {
    console.error('❌ Aucune barre mère disponible');
    this.showNotification('Aucune barre mère disponible. Veuillez d\'abord ajouter des barres mères.', 'error');
    return false;
  }

  // NOUVELLE VALIDATION: Vérifier la compatibilité profil + longueur
  console.log('🔍 === VALIDATION COMPATIBILITÉ PROFIL + LONGUEUR ===');
  var incompatiblePieces = [];
  var missingProfiles = new Set();
  var insufficientLengths = [];
  var _loop = function _loop() {
    var pieceReq = _allPieceRequirements[_i3];
    var profile = pieceReq.profile;
    var requiredLength = pieceReq.length;

    // 1. Vérifier si le profil existe
    if (!motherBarCapabilities[profile]) {
      missingProfiles.add(profile);
      incompatiblePieces.push(ui_controller_objectSpread(ui_controller_objectSpread({}, pieceReq), {}, {
        issue: 'profil_manquant'
      }));
      return 1; // continue
    }

    // 2. Vérifier si au moins une barre mère a une longueur suffisante
    var compatibleBars = motherBarCapabilities[profile].filter(function (bar) {
      return bar.length >= requiredLength;
    });
    if (compatibleBars.length === 0) {
      // Aucune barre mère assez longue
      var maxAvailableLength = Math.max.apply(Math, ui_controller_toConsumableArray(motherBarCapabilities[profile].map(function (bar) {
        return bar.length;
      })));
      insufficientLengths.push(ui_controller_objectSpread(ui_controller_objectSpread({}, pieceReq), {}, {
        maxAvailableLength: maxAvailableLength,
        issue: 'longueur_insuffisante'
      }));
      incompatiblePieces.push(ui_controller_objectSpread(ui_controller_objectSpread({}, pieceReq), {}, {
        maxAvailableLength: maxAvailableLength,
        issue: 'longueur_insuffisante'
      }));
    } else {
      // Compatible - log pour debug
      console.log("\u2705 ".concat(pieceReq.nom, ": ").concat(compatibleBars.length, " barre(s) m\xE8re(s) compatible(s)"));
    }
  };
  for (var _i3 = 0, _allPieceRequirements = allPieceRequirements; _i3 < _allPieceRequirements.length; _i3++) {
    if (_loop()) continue;
  }

  // Rapport des problèmes trouvés
  if (missingProfiles.size > 0) {
    console.error("\u274C Profils manquants: ".concat(Array.from(missingProfiles).join(', ')));
  }
  if (insufficientLengths.length > 0) {
    console.error("\u274C ".concat(insufficientLengths.length, " pi\xE8ce(s) avec longueur insuffisante:"));
    insufficientLengths.forEach(function (piece) {
      console.error("   \u2022 ".concat(piece.nom, " (").concat(piece.profile, "): besoin ").concat(UIUtils.formatLenght(piece.length), "mm, max disponible ").concat(UIUtils.formatLenght(piece.maxAvailableLength), "mm"));
    });
  }

  // Si des incompatibilités existent, afficher un message d'erreur détaillé
  if (incompatiblePieces.length > 0) {
    var errorMessages = this.generateCompatibilityErrorMessage(incompatiblePieces, missingProfiles, insufficientLengths);
    this.showNotification(errorMessages["short"], 'error');

    // Log détaillé pour la console
    console.error('❌ === INCOMPATIBILITÉS DÉTECTÉES ===');
    console.error(errorMessages.detailed);
    console.error('❌ =====================================');
    return false;
  }
  console.log('✅ Validation de compatibilité réussie');
  console.log('🔍 =======================================');
  return true;
}), "generateCompatibilityErrorMessage", function generateCompatibilityErrorMessage(incompatiblePieces, missingProfiles, insufficientLengths) {
  var shortMessage = '';
  var detailedMessage = '';

  // Messages pour les profils manquants
  if (missingProfiles.size > 0) {
    var profilesList = Array.from(missingProfiles).join(', ');
    if (missingProfiles.size === 1) {
      shortMessage += "Profil ".concat(profilesList, " : aucune barre m\xE8re disponible. ");
    } else {
      shortMessage += "Profils ".concat(profilesList, " : aucune barre m\xE8re disponible. ");
    }
    detailedMessage += "PROFILS MANQUANTS:\n".concat(profilesList, "\n\n");
  }

  // Messages pour les longueurs insuffisantes - VERSION DÉTAILLÉE
  if (insufficientLengths.length > 0) {
    if (insufficientLengths.length === 1) {
      var piece = insufficientLengths[0];
      shortMessage += "".concat(piece.nom, " (").concat(piece.profile, ") : besoin ").concat(UIUtils.formatLenght(piece.length), "mm, max disponible ").concat(UIUtils.formatLenght(piece.maxAvailableLength), "mm (d\xE9ficit ").concat(UIUtils.formatLenght(piece.length - piece.maxAvailableLength), "mm).");
    } else if (insufficientLengths.length <= 3) {
      // Afficher jusqu'à 3 pièces problématiques
      var piecesList = insufficientLengths.map(function (piece) {
        return "".concat(piece.nom, " (").concat(UIUtils.formatLenght(piece.length), "mm > ").concat(UIUtils.formatLenght(piece.maxAvailableLength), "mm)");
      }).join(', ');
      shortMessage += "Pi\xE8ces trop longues : ".concat(piecesList, ".");
    } else {
      // Plus de 3 pièces : résumer
      var firstThree = insufficientLengths.slice(0, 2);
      var _piecesList = firstThree.map(function (piece) {
        return "".concat(piece.nom, " (").concat(UIUtils.formatLenght(piece.length), "mm > ").concat(UIUtils.formatLenght(piece.maxAvailableLength), "mm)");
      }).join(', ');
      shortMessage += "".concat(insufficientLengths.length, " pi\xE8ces trop longues : ").concat(_piecesList, " et ").concat(insufficientLengths.length - 2, " autre(s).");
    }
    detailedMessage += "LONGUEURS INSUFFISANTES:\n";
    insufficientLengths.forEach(function (piece) {
      detailedMessage += "\u2022 ".concat(piece.nom, " (").concat(piece.profile, "): \n");
      detailedMessage += "  Besoin: ".concat(UIUtils.formatLenght(piece.length), "mm\n");
      detailedMessage += "  Maximum disponible: ".concat(UIUtils.formatLenght(piece.maxAvailableLength), "mm\n");
      detailedMessage += "  D\xE9ficit: ".concat(UIUtils.formatLenght(piece.length - piece.maxAvailableLength), "mm\n\n");
    });
  }

  // Message de suggestion synthétique
  if (missingProfiles.size > 0 && insufficientLengths.length > 0) {
    shortMessage += " Ajoutez des barres m\xE8res pour ces profils et longueurs.";
  } else if (missingProfiles.size > 0) {
    shortMessage += " Ajoutez des barres m\xE8res pour ces profils.";
  } else if (insufficientLengths.length > 0) {
    shortMessage += " Ajoutez des barres m\xE8res plus longues.";
  }
  return {
    "short": shortMessage.trim(),
    detailed: detailedMessage.trim()
  };
}), "clearOptimizationResults", function clearOptimizationResults() {
  try {
    console.log('🧹 Nettoyage des résultats d\'optimisation précédents');

    // Réinitialiser les résultats actuels
    this.currentResults = null;
    this.currentF4CObjects = null;

    // Nettoyer l'interface des résultats
    var globalSummaryContainer = document.getElementById('global-summary-container');
    if (globalSummaryContainer) {
      globalSummaryContainer.innerHTML = '';
    }
    var modelDetailsContainer = document.getElementById('model-details-container');
    if (modelDetailsContainer) {
      modelDetailsContainer.innerHTML = '';
    }
    var F4CFilesContainer = document.getElementById('F4C-files-list');
    if (F4CFilesContainer) {
      F4CFilesContainer.innerHTML = '';
    }

    // Masquer la section résultats et afficher la section données
    var resultSection = document.getElementById('result-section');
    var dataSection = document.getElementById('data-section');
    if (resultSection) {
      resultSection.classList.remove('active');
    }
    if (dataSection) {
      dataSection.classList.add('active');
    }

    // Masquer la navigation résultats
    var resultsNav = document.getElementById('results-nav');
    if (resultsNav) {
      resultsNav.style.display = 'none';
    }
    console.log('✅ Résultats d\'optimisation nettoyés');
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage des résultats:', error);
  }
}), ui_controller_defineProperty(_UIController, "showResultsTabs", function showResultsTabs() {
  try {
    console.log('📊 Affichage des onglets de résultats');

    // Vérifier que nous avons des résultats à afficher
    if (!this.currentResults) {
      console.warn('⚠️ Aucun résultat à afficher');
      return;
    }

    // Basculer vers la section résultats
    this.showSection('result-section');

    // Afficher la navigation résultats
    var resultsNav = document.getElementById('results-nav');
    if (resultsNav) {
      resultsNav.style.display = 'flex';
    }
    console.log('✅ Onglets de résultats affichés');

    // MODIFIÉ: Scroll immédiat vers le haut sans animation, puis pas de scroll vers les détails
    setTimeout(function () {
      // Scroll instantané vers le haut de la page (sans animation)
      window.scrollTo({
        top: 0,
        behavior: 'instant'
      });
      console.log('🔝 Page positionnée en haut');

      // SUPPRIMÉ: Le scroll vers les détails des modèles
      // La page reste simplement en haut, l'utilisateur peut défiler manuellement
    }, 100); // Court délai pour laisser le rendu se faire
  } catch (error) {
    console.error('❌ Erreur lors de l\'affichage des résultats:', error);
    this.showNotification('Erreur lors de l\'affichage des résultats', 'error');
  }
}));
;// ./src/js/parser.js
/**
 * Analyseur pour fichiers .nc2
 * Suit l'algorithme du diagramme de flux pour déterminer l'orientation et calculer les angles
 */

// Configuration pour la structure du tableau 3D des valeurs AK
var AK_index = {
  'paragraphes': 3,
  'colonnes': 6,
  'lignes': 5,
  'defaut': -0.00
};
var Parser = {
  /**
   * Analyse un fichier .nc2 en suivant l'algorithme du diagramme de flux
   * @param {string} contenu - Contenu du fichier .nc2
   * @returns {Object} - Barre analysée
   */
  parseNC2: function parseNC2(contenu) {
    console.log("Analyse du fichier NC2...");
    var lignes = contenu.split('\n').map(function (ligne) {
      return ligne.trim();
    });
    var barreActuelle = this.initialiserNouvelleBarre();

    // Analyser les premières valeurs par lignes
    this.analyserInfosDeBaseBarre(barreActuelle, lignes);

    // Analyser les tableaux des sections AK
    var AK_valeurs = this.construireTableauAK3D(lignes);

    // Récupérer les angles et l'orientation depuis AK
    this.analyserAnglesEtOrientation(barreActuelle, AK_valeurs);

    // Générer les codes F4C
    this.genererCodesF4C(barreActuelle, AK_valeurs);

    // Afficher la barre analysée pour le débogage
    console.log("Barre analysée:", barreActuelle);
    return barreActuelle;
  },
  /**
   * Initialise une nouvelle barre
   * @returns {Object} - Objet barre initialisé
   */
  initialiserNouvelleBarre: function initialiserNouvelleBarre() {
    return {
      nom: '',
      profil: '',
      quantite: 1,
      longueur: 0,
      hauteur: 0,
      largeur: 0,
      orientation: '',
      angle_1: 0,
      angle_2: 0,
      // Propriétés pour F4C
      B021: '',
      B035: '',
      S051: '',
      S052: '',
      S053: '',
      S054: '',
      S055: '',
      S058: ''
    };
  },
  /**
   * Analyse les informations de base d'une barre
   * @param {Object} barreActuelle - Barre en cours de traitement
   * @param {Array} lignes - Toutes les lignes du fichier
   */
  analyserInfosDeBaseBarre: function analyserInfosDeBaseBarre(barreActuelle, lignes) {
    for (var i = 0; i < lignes.length; i++) {
      var ligne = lignes[i];
      var indexLigne = i + 1; // Pour l'indexation base 1

      // Nom de la barre
      if (indexLigne == 2) {
        barreActuelle.nom = ligne.replace('**', '').split('.nc')[0].trim();
      }

      // Quantité
      if (indexLigne == 8) {
        var quantite = parseInt(ligne.split('.')[0].trim());
        if (!isNaN(quantite)) {
          barreActuelle.quantite = quantite;
        }
      }

      // Profil (ex: HEA100, IPE200, etc.)
      if (indexLigne == 9) {
        barreActuelle.profil = ligne.trim();
      }

      // Longueur
      if (indexLigne == 11) {
        var longueur = parseInt(ligne.split('.')[0].trim());
        barreActuelle.longueur = longueur;
      }

      // Hauteur
      if (indexLigne == 12) {
        var hauteur = parseInt(ligne.split('.')[0].trim());
        barreActuelle.hauteur = hauteur;
      }

      // Largeur
      if (indexLigne == 13) {
        var largeur = parseInt(ligne.split('.')[0].trim());
        barreActuelle.largeur = largeur;
      }
    }
  },
  /**
   * Analyse les angles et l'orientation de la barre à partir des valeurs AK
   * @param {Object} barre - Barre à traiter
   * @param {Array} AK_valeurs - Tableau 3D des valeurs AK
   */
  analyserAnglesEtOrientation: function analyserAnglesEtOrientation(barre, AK_valeurs) {
    var AK_v4 = AK_valeurs[1][4]; // Première section AK, colonne 4
    var AK_o4 = AK_valeurs[2][4]; // Deuxième section AK, colonne 4

    if (AK_v4[2] != 0 || AK_v4[4] != 0) {
      barre.angle_1 = AK_v4[4];
      barre.angle_2 = AK_v4[2];
      barre.orientation = 'debout';
    } else if (AK_o4[1] != 0 || AK_o4[3] != 0) {
      barre.angle_1 = AK_o4[1] != 0 ? -AK_o4[1] : AK_o4[1];
      barre.angle_2 = AK_o4[3] != 0 ? -AK_o4[3] : AK_o4[3];
      barre.orientation = 'a-plat';
    } else {
      barre.angle_1 = 0.00;
      barre.angle_2 = 0.00;
      barre.orientation = 'a-plat';
    }
  },
  /**
   * Génère les codes F4C
   * @param {Object} barre - Barre à traiter
   * @param {Array} AK_valeurs - Tableau 3D des valeurs AK
   */
  genererCodesF4C: function genererCodesF4C(barre, AK_valeurs) {
    // B021 = Code profilé à 3 lettres + 5 espaces
    barre.B021 = barre.profil.substring(0, 3) + '     ';

    // B035 = Longueur du profil en centimètres
    var racine_B035 = barre.orientation == 'debout' ? barre.largeur : barre.hauteur;
    barre.B035 = Math.round(racine_B035 * 10000).toString();

    // S052 et S053 = Quantité
    barre.S052 = barre.quantite.toString();
    barre.S053 = barre.quantite.toString();

    // S054 et S055 = Angles (en centièmes de degré)
    barre.S054 = Math.round((90 + barre.angle_1) * 100).toString();
    barre.S055 = Math.round((90 + barre.angle_2) * 100).toString();

    // S051 = longueur en fonction des angles
    var position_AK_S051 = [0, 0, 0];
    var S058;
    if (barre.orientation === 'a-plat') {
      if (barre.angle_1 > 0) {
        position_AK_S051 = [1, 1, 4]; // AK v(1;4)
        S058 = 2;
      } else {
        position_AK_S051 = [1, 1, 2]; // AK v(1;2)
        S058 = 1;
      }
    } else if (barre.orientation === 'debout') {
      if (barre.angle_1 < 0) {
        position_AK_S051 = [2, 1, 2]; // AK o(1;2)
        S058 = 1;
      } else {
        position_AK_S051 = [2, 1, 4]; // AK o(1;4)
        S058 = 2;
      }
    }
    barre.S051 = Math.round(AK_valeurs[position_AK_S051[0]][position_AK_S051[1]][position_AK_S051[2]] * 10000).toString();
    barre.S058 = S058.toString();
  },
  /**
   * Initialise un tableau 3D pour les valeurs AK avec indexation base 1
   * @returns {Array} - Tableau 3D initialisé
   */
  initialiserValeursAK: function initialiserValeursAK() {
    var AK_valeurs;
    // Structure: AK_valeurs[paragraphe][colonne][ligne] (indexation base 1)

    // Créer des tableaux avec +1 de taille pour accommoder l'indexation base 1
    AK_valeurs = new Array(AK_index.paragraphes + 1);
    for (var i = 0; i <= AK_index.paragraphes; i++) {
      AK_valeurs[i] = new Array(AK_index.colonnes + 1);
      for (var j = 0; j <= AK_index.colonnes; j++) {
        AK_valeurs[i][j] = new Array(AK_index.lignes + 1);
        for (var k = 0; k <= AK_index.lignes; k++) {
          AK_valeurs[i][j][k] = AK_index.defaut;
        }
      }
    }
    return AK_valeurs;
  },
  /**
   * Construit le tableau AK 3D à partir des lignes du fichier NC avec indexation base 1
   * @param {Array} lignes - Lignes du fichier NC
   * @returns {Array} - Tableau AK 3D rempli
   */
  construireTableauAK3D: function construireTableauAK3D(lignes) {
    // Initialiser le tableau AK_valeurs
    var AK_valeurs = this.initialiserValeursAK();

    // Remplir le tableau AK_valeurs avec les données du fichier NC
    var paragrapheActuel = 0; // Commence à 0, sera incrémenté à 1
    var ligneDansParagraphe = 0; // Sera incrémenté à 1
    var dansParagrapheAK = false;
    for (var i = 0; i < lignes.length; i++) {
      var ligne = lignes[i];

      // Détecter le début d'un paragraphe AK
      if (ligne.startsWith('AK')) {
        dansParagrapheAK = true;
        paragrapheActuel++; // Incrémenter pour obtenir une indexation base 1 (1, 2, 3)

        // Vérifier qu'on ne dépasse pas le nombre de paragraphes définis
        if (paragrapheActuel > AK_index.paragraphes) {
          console.warn("Limite du nombre de paragraphes AK atteinte (".concat(AK_index.paragraphes, ")"));
          break;
        }
        ligneDansParagraphe = 0; // Réinitialiser le compteur de lignes
        continue;
      }

      // Détecter la fin d'un paragraphe AK
      if (ligne.startsWith('EN')) {
        dansParagrapheAK = false;
        continue;
      }

      // Traiter les lignes à l'intérieur d'un paragraphe AK
      if (dansParagrapheAK && ligne.trim() !== '') {
        ligneDansParagraphe++; // Incrémenter pour obtenir une indexation base 1

        // Limiter au nombre de lignes défini dans AK_index
        if (ligneDansParagraphe > AK_index.lignes) {
          console.warn("Limite de lignes dans le paragraphe AK ".concat(paragrapheActuel, " atteinte (limite: ").concat(AK_index.lignes, ")"));
          continue;
        }

        // Séparer les valeurs et supprimer l'identifiant (v, o, u) s'il est présent
        var valeurs = ligne.trim().split(/\s+/);
        if (valeurs.length > 0 && /^[a-zA-Z]/.test(valeurs[0])) {
          valeurs.shift(); // Supprimer l'identifiant (v, o, u)
        }

        // Stocker chaque valeur dans le tableau AK_valeurs avec indexation base 1
        for (var col = 0; col < valeurs.length && col < AK_index.colonnes; col++) {
          var valeur = valeurs[col];

          // Supprimer une quelconque lettre à la fin si présente
          if (valeur.length > 0) {
            valeur = valeur.replace(/[a-zA-Z]$/, '');
          }

          // Convertir en nombre et stocker avec indexation base 1
          AK_valeurs[paragrapheActuel][col + 1][ligneDansParagraphe] = parseFloat(valeur) || 0;
        }
      }
    }
    return AK_valeurs;
  }
};
;// ./src/js/algorithms/First-Fit-Decreasing.js
function First_Fit_Decreasing_toConsumableArray(r) { return First_Fit_Decreasing_arrayWithoutHoles(r) || First_Fit_Decreasing_iterableToArray(r) || First_Fit_Decreasing_unsupportedIterableToArray(r) || First_Fit_Decreasing_nonIterableSpread(); }
function First_Fit_Decreasing_nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function First_Fit_Decreasing_iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function First_Fit_Decreasing_arrayWithoutHoles(r) { if (Array.isArray(r)) return First_Fit_Decreasing_arrayLikeToArray(r); }
function First_Fit_Decreasing_createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = First_Fit_Decreasing_unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function First_Fit_Decreasing_unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return First_Fit_Decreasing_arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? First_Fit_Decreasing_arrayLikeToArray(r, a) : void 0; } }
function First_Fit_Decreasing_arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
/**
 * Algorithme First-Fit Decreasing pur
 * Prend des barres mères et des pièces, retourne les schémas de coupe
 */
function solveGreedyFFD(motherBars, pieces) {
  console.log('🔧 Exécution FFD pur');

  // Créer la liste de toutes les pièces individuelles
  var allPieces = [];
  pieces.forEach(function (piece) {
    for (var i = 0; i < piece.quantity; i++) {
      allPieces.push(piece.length);
    }
  });

  // Trier par ordre décroissant
  allPieces.sort(function (a, b) {
    return b - a;
  });

  // Créer le pool de barres disponibles
  var availableBars = [];
  motherBars.forEach(function (barType) {
    for (var i = 0; i < barType.quantity; i++) {
      availableBars.push({
        length: barType.length,
        originalLength: barType.length,
        remainingLength: barType.length,
        cuts: [],
        barId: "".concat(barType.length, "_").concat(i)
      });
    }
  });
  var usedBars = [];

  // First-Fit Decreasing
  for (var _i = 0, _allPieces = allPieces; _i < _allPieces.length; _i++) {
    var pieceLength = _allPieces[_i];
    var placed = false;

    // 1. Essayer de placer dans une barre déjà utilisée
    var _iterator = First_Fit_Decreasing_createForOfIteratorHelper(usedBars),
      _step;
    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var usedBar = _step.value;
        if (usedBar.remainingLength >= pieceLength) {
          usedBar.cuts.push(pieceLength);
          usedBar.remainingLength -= pieceLength;
          placed = true;
          break;
        }
      }

      // 2. Si pas placée, prendre une nouvelle barre
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
    if (!placed) {
      // Trouver la plus petite barre qui peut contenir cette pièce
      var bestBar = null;
      var bestBarIndex = -1;
      for (var i = 0; i < availableBars.length; i++) {
        var bar = availableBars[i];
        if (bar.length >= pieceLength) {
          if (!bestBar || bar.length < bestBar.length) {
            bestBar = bar;
            bestBarIndex = i;
          }
        }
      }
      if (bestBar) {
        // Retirer cette barre du pool
        availableBars.splice(bestBarIndex, 1);

        // Placer la pièce
        bestBar.cuts.push(pieceLength);
        bestBar.remainingLength -= pieceLength;

        // Ajouter aux barres utilisées
        usedBars.push(bestBar);
        placed = true;
      }
    }
    if (!placed) {
      console.warn("\u26A0\uFE0F Impossible de placer la pi\xE8ce de ".concat(pieceLength, "mm"));
    }
  }
  console.log("\u2705 FFD termin\xE9: ".concat(usedBars.length, " barres utilis\xE9es"));

  // Retourner uniquement les schémas de coupe
  return {
    cuttingPatterns: usedBars.map(function (bar) {
      return {
        motherBarLength: bar.originalLength,
        cuts: First_Fit_Decreasing_toConsumableArray(bar.cuts),
        waste: bar.remainingLength,
        count: 1
      };
    })
  };
}
// EXTERNAL MODULE: ./node_modules/javascript-lp-solver/src/main.js
var main = __webpack_require__(61);
var main_default = /*#__PURE__*/__webpack_require__.n(main);
;// ./src/js/algorithms/Integer-Linear-Programming.js
function Integer_Linear_Programming_typeof(o) { "@babel/helpers - typeof"; return Integer_Linear_Programming_typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, Integer_Linear_Programming_typeof(o); }
function Integer_Linear_Programming_createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = Integer_Linear_Programming_unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function Integer_Linear_Programming_slicedToArray(r, e) { return Integer_Linear_Programming_arrayWithHoles(r) || Integer_Linear_Programming_iterableToArrayLimit(r, e) || Integer_Linear_Programming_unsupportedIterableToArray(r, e) || Integer_Linear_Programming_nonIterableRest(); }
function Integer_Linear_Programming_nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function Integer_Linear_Programming_iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function Integer_Linear_Programming_arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function Integer_Linear_Programming_ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function Integer_Linear_Programming_objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? Integer_Linear_Programming_ownKeys(Object(t), !0).forEach(function (r) { Integer_Linear_Programming_defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : Integer_Linear_Programming_ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function Integer_Linear_Programming_defineProperty(e, r, t) { return (r = Integer_Linear_Programming_toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function Integer_Linear_Programming_toPropertyKey(t) { var i = Integer_Linear_Programming_toPrimitive(t, "string"); return "symbol" == Integer_Linear_Programming_typeof(i) ? i : i + ""; }
function Integer_Linear_Programming_toPrimitive(t, r) { if ("object" != Integer_Linear_Programming_typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != Integer_Linear_Programming_typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function Integer_Linear_Programming_toConsumableArray(r) { return Integer_Linear_Programming_arrayWithoutHoles(r) || Integer_Linear_Programming_iterableToArray(r) || Integer_Linear_Programming_unsupportedIterableToArray(r) || Integer_Linear_Programming_nonIterableSpread(); }
function Integer_Linear_Programming_nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function Integer_Linear_Programming_unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return Integer_Linear_Programming_arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? Integer_Linear_Programming_arrayLikeToArray(r, a) : void 0; } }
function Integer_Linear_Programming_iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function Integer_Linear_Programming_arrayWithoutHoles(r) { if (Array.isArray(r)) return Integer_Linear_Programming_arrayLikeToArray(r); }
function Integer_Linear_Programming_arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }


/**
 * Algorithme ILP pur - Interface simplifiée mais logique complète
 * Prend des barres mères et des pièces, retourne les schémas de coupe optimaux
 */
function solveWithILP(motherBars, pieces) {
  console.log('🔧 Exécution ILP pur');

  // Convertir au format attendu par l'algorithme original
  var modelData = {
    pieces: {
      'model': pieces
    },
    motherBars: {
      'model': motherBars
    }
  };

  // Appeler l'algorithme original avec une fonction de progression vide
  var results = solveWithILPOriginal(modelData.motherBars, modelData.pieces, function () {});

  // Extraire les résultats du modèle unique
  var modelResult = results.modelResults['model'];
  if (!modelResult || !modelResult.layouts) {
    throw new Error("Aucun résultat ILP généré");
  }

  // Convertir au format de sortie attendu
  var cuttingPatterns = modelResult.layouts.map(function (layout) {
    return {
      motherBarLength: layout.originalLength,
      cuts: Integer_Linear_Programming_toConsumableArray(layout.cuts),
      waste: layout.waste,
      count: layout.count
    };
  });
  console.log("\u2705 ILP termin\xE9: ".concat(cuttingPatterns.length, " patterns utilis\xE9s"));
  return {
    cuttingPatterns: cuttingPatterns
  };
}

/**
 * Algorithme ILP original complet (conservé tel quel)
 * Résout le problème de découpe de barres en utilisant l'ILP (Integer Linear Programming)
 * Basé sur le Column Generation approach du Cutting Stock Problem
 */
function solveWithILPOriginal(motherBars, pieces) {
  var progressCallback = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function () {};
  console.log("🔧 Début de l'optimisation ILP avancée");
  var results = {};
  var globalStats = {
    totalBarsUsed: 0,
    totalWaste: 0,
    totalRemainingPieces: 0
  };

  // Traiter chaque modèle séparément
  for (var model in pieces) {
    if (!pieces[model] || pieces[model].length === 0) continue;
    if (!motherBars[model] || motherBars[model].length === 0) continue;
    console.log("\uD83C\uDFAF Optimisation ILP avanc\xE9e pour le mod\xE8le ".concat(model));
    progressCallback({
      step: "Traitement du mod\xE8le ".concat(model),
      percentage: 10
    });
    var modelResult = solveModelWithAdvancedILP(motherBars[model], pieces[model], model, progressCallback);
    globalStats.totalBarsUsed += modelResult.rawData.totalMotherBarsUsed;
    globalStats.totalWaste += modelResult.rawData.wasteLength;
    globalStats.totalRemainingPieces += modelResult.rawData.remainingPieces.length;
    results[model] = modelResult;
    console.log("\u2705 Mod\xE8le ".concat(model, ": ").concat(modelResult.rawData.totalMotherBarsUsed, " barres, efficacit\xE9 ").concat(modelResult.stats.utilizationRate, "%"));
    progressCallback({
      step: "Mod\xE8le ".concat(model, " termin\xE9"),
      percentage: 100
    });
  }
  var globalStatistics = calculateGlobalStatistics(results);
  console.log("\uD83D\uDCCA GLOBAL ILP: ".concat(globalStats.totalBarsUsed, " barres, efficacit\xE9 ").concat(globalStatistics.utilizationRate, "%"));
  return {
    modelResults: results,
    globalStats: Integer_Linear_Programming_objectSpread(Integer_Linear_Programming_objectSpread({}, globalStats), {}, {
      statistics: globalStatistics
    })
  };
}

/**
 * Résout un modèle spécifique avec ILP avancé
 */
function solveModelWithAdvancedILP(stockBars, demandPieces, model) {
  var progressCallback = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function () {};
  console.log("  \uD83D\uDD0D Analyse du mod\xE8le ".concat(model, ":"));

  // 1. Préparer les données
  var stockSizes = stockBars.map(function (bar) {
    return {
      size: parseInt(bar.length),
      cost: 1,
      quantity: parseInt(bar.quantity)
    };
  });
  var pieceCounts = {};
  var cutSizes = [];
  demandPieces.forEach(function (piece) {
    var length = parseInt(piece.length);
    var quantity = parseInt(piece.quantity);
    if (!pieceCounts[length]) {
      pieceCounts[length] = 0;
      cutSizes.push(length);
    }
    pieceCounts[length] += quantity;
  });
  var requiredCuts = Object.entries(pieceCounts).map(function (_ref) {
    var _ref2 = Integer_Linear_Programming_slicedToArray(_ref, 2),
      length = _ref2[0],
      count = _ref2[1];
    return {
      size: parseInt(length),
      count: count
    };
  });
  console.log("    \uD83D\uDCCF Pi\xE8ces demand\xE9es: ".concat(requiredCuts.map(function (c) {
    return "".concat(c.count, "\xD7").concat(c.size, "mm");
  }).join(', ')));
  console.log("    \uD83D\uDCE6 Stock disponible: ".concat(stockSizes.map(function (s) {
    return "".concat(s.quantity, "\xD7").concat(s.size, "mm");
  }).join(', ')));

  // Vérification de faisabilité
  var totalDemandLength = requiredCuts.reduce(function (sum, cut) {
    return sum + cut.size * cut.count;
  }, 0);
  var totalStockLength = stockSizes.reduce(function (sum, stock) {
    return sum + stock.size * stock.quantity;
  }, 0);
  if (totalDemandLength > totalStockLength) {
    throw new Error("Stock insuffisant");
  }
  progressCallback({
    step: "G\xE9n\xE9ration des patterns pour ".concat(model),
    percentage: 30
  });

  // 2. Générer les patterns de découte
  var cuttingPatterns = generateAdvancedCuttingPatterns(stockSizes, cutSizes, 0);
  console.log("    \uD83D\uDD27 ".concat(cuttingPatterns.totalPatterns, " patterns g\xE9n\xE9r\xE9s au total"));
  progressCallback({
    step: "R\xE9solution ILP pour ".concat(model),
    percentage: 70
  });

  // 3. Résoudre le modèle ILP
  var ilpSolution = solveAdvancedILPModel(cuttingPatterns, requiredCuts);
  if (!ilpSolution || !ilpSolution.solution || !ilpSolution.solution.feasible) {
    throw new Error("Aucune solution ILP trouvée");
  }
  progressCallback({
    step: "Finalisation pour ".concat(model),
    percentage: 90
  });

  // 4. Convertir la solution
  return convertILPSolutionToResult(ilpSolution, model);
}

/**
 * Convertit la solution ILP en format attendu
 */
function convertILPSolutionToResult(ilpSolution, model) {
  console.log("    \uD83D\uDD04 Conversion de la solution ILP pour ".concat(model, ":"));
  var solution = ilpSolution.solution,
    patterns = ilpSolution.patterns;
  var layouts = [];
  var totalWaste = 0;
  var totalUsedBars = 0;

  // Traiter chaque pattern sélectionné
  var _loop = function _loop() {
    var _Object$entries$_i = Integer_Linear_Programming_slicedToArray(_Object$entries[_i], 2),
      varName = _Object$entries$_i[0],
      quantity = _Object$entries$_i[1];
    if (varName.startsWith('stock') && quantity > 0) {
      var pattern = patterns.patterns.find(function (p) {
        return p.varName === varName;
      });
      if (pattern) {
        // Extraire les coupes de ce pattern
        var cuts = [];
        for (var _i2 = 0, _Object$entries2 = Object.entries(pattern.cuts); _i2 < _Object$entries2.length; _i2++) {
          var _Object$entries2$_i = Integer_Linear_Programming_slicedToArray(_Object$entries2[_i2], 2),
            cutKey = _Object$entries2$_i[0],
            cutCount = _Object$entries2$_i[1];
          if (cutKey.startsWith('cut') && cutCount > 0) {
            var cutSize = parseInt(cutKey.replace('cut', ''));
            for (var i = 0; i < cutCount; i++) {
              cuts.push(cutSize);
            }
          }
        }
        var usedLength = cuts.reduce(function (sum, cut) {
          return sum + cut;
        }, 0);
        var waste = pattern.stockSize - usedLength;
        layouts.push({
          originalLength: pattern.stockSize,
          length: pattern.stockSize,
          cuts: cuts,
          count: quantity,
          waste: waste
        });
        totalWaste += waste * quantity;
        totalUsedBars += quantity;
      }
    }
  };
  for (var _i = 0, _Object$entries = Object.entries(solution); _i < _Object$entries.length; _i++) {
    _loop();
  }
  var totalBarLength = layouts.reduce(function (sum, layout) {
    return sum + layout.originalLength * layout.count;
  }, 0);
  var utilizationRate = totalBarLength > 0 ? ((totalBarLength - totalWaste) / totalBarLength * 100).toFixed(3) : 0;
  console.log("    \uD83D\uDCCA R\xE9sultat final: ".concat(totalUsedBars, " barres, ").concat(totalWaste, "mm de chutes, efficacit\xE9 ").concat(utilizationRate, "%"));
  return {
    layouts: layouts,
    rawData: {
      totalMotherBarsUsed: totalUsedBars,
      wasteLength: totalWaste,
      remainingPieces: []
    },
    stats: {
      utilizationRate: parseFloat(utilizationRate)
    }
  };
}

/**
 * Génère les patterns de découpe avancés OPTIMISÉS POUR MAXIMISER L'EFFICACITÉ
 */
function generateAdvancedCuttingPatterns(stockSizes, cutSizes, bladeSize) {
  console.log("    \uD83D\uDD04 G\xE9n\xE9ration optimis\xE9e des patterns (objectif: maximiser l'efficacit\xE9)...");
  var waysOfCuttingStocks = stockSizes.map(function (_ref3) {
    var size = _ref3.size,
      cost = _ref3.cost,
      quantity = _ref3.quantity;
    console.log("      \uD83D\uDCCF Analyse barre ".concat(size, "mm:"));
    var waysOfCutting = generateOptimizedPatterns(size, cutSizes, bladeSize, 100);
    console.log("        \u2713 ".concat(waysOfCutting.length, " patterns optimis\xE9s g\xE9n\xE9r\xE9s"));

    // Afficher les meilleurs patterns (inchangé)
    var sortedWays = waysOfCutting.map(function (way) {
      return {
        cuts: way,
        efficiency: way.length > 0 ? (way.reduce(function (sum, cut) {
          return sum + cut;
        }, 0) / size * 100).toFixed(1) : 0,
        waste: size - way.reduce(function (sum, cut) {
          return sum + cut;
        }, 0)
      };
    }).sort(function (a, b) {
      return parseFloat(b.efficiency) - parseFloat(a.efficiency);
    });
    console.log("        \uD83D\uDCCA Top 5 patterns:");
    sortedWays.slice(0, 5).forEach(function (pattern, index) {
      var cutCounts = {};
      pattern.cuts.forEach(function (cut) {
        cutCounts[cut] = (cutCounts[cut] || 0) + 1;
      });
      var cutStr = Object.entries(cutCounts).map(function (_ref4) {
        var _ref5 = Integer_Linear_Programming_slicedToArray(_ref4, 2),
          cut = _ref5[0],
          count = _ref5[1];
        return "".concat(count, "\xD7").concat(cut, "mm");
      }).join(' + ') || 'Barre vide';
      console.log("          ".concat(index + 1, ". ").concat(cutStr, " (").concat(pattern.efficiency, "% efficacit\xE9, ").concat(pattern.waste, "mm chute)"));
    });

    // CHANGEMENT MAJEUR: Format ILP pour maximiser l'efficacité
    var versions = waysOfCutting.map(function (way) {
      var stockCut = {};
      var _iterator = Integer_Linear_Programming_createForOfIteratorHelper(cutSizes),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var cut = _step.value;
          stockCut["cut".concat(cut)] = 0;
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
      var _iterator2 = Integer_Linear_Programming_createForOfIteratorHelper(way),
        _step2;
      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var _cut = _step2.value;
          stockCut["cut".concat(_cut)] = stockCut["cut".concat(_cut)] + 1;
        }

        // NOUVEAU: Calculer les métriques d'efficacité pour ce pattern
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }
      var usedLength = way.reduce(function (sum, cut) {
        return sum + cut;
      }, 0);
      var wasteLength = size - usedLength;
      var efficiency = usedLength / size;

      // Objectif: On veut maximiser l'efficacité globale
      // Donc on va minimiser le "coût d'inefficacité" de chaque pattern
      // Plus le pattern est efficace, moins il "coûte" en termes d'optimisation

      // Coût = longueur_barre_mère * (1 - efficacité) = longueur_gaspillée
      // Cela favorise les patterns avec moins de gaspillage proportionnel
      stockCut.wasteLength = wasteLength; // Chute absolue de ce pattern
      stockCut.motherBarLength = size; // Longueur de la barre mère
      stockCut.efficiency = efficiency; // Efficacité de ce pattern

      // Le coût à minimiser = chute de ce pattern
      // L'ILP va naturellement minimiser la somme des chutes
      stockCut.cost = wasteLength;
      return stockCut;
    });
    return {
      size: size,
      cost: cost,
      quantity: quantity,
      versions: versions
    };
  });

  // Créer les variables pour le modèle ILP
  var variables = {};
  var ints = {};
  var allPatterns = [];
  var patternIndex = 0;
  waysOfCuttingStocks.forEach(function (_ref6) {
    var size = _ref6.size,
      cost = _ref6.cost,
      quantity = _ref6.quantity,
      versions = _ref6.versions;
    versions.forEach(function (cut, index) {
      var varName = "stock".concat(size, "version").concat(index);

      // NOUVEAU: Chaque variable a maintenant le coût = chute de ce pattern
      variables[varName] = Integer_Linear_Programming_objectSpread({}, cut); // cut.cost = chute déjà calculée
      ints[varName] = 1;
      allPatterns.push({
        varName: varName,
        stockSize: size,
        version: index,
        cuts: cut,
        wasteLength: cut.wasteLength,
        // Chute de ce pattern
        motherBarLength: cut.motherBarLength,
        // Longueur barre mère
        efficiency: cut.efficiency,
        // Efficacité de ce pattern
        cost: cut.cost,
        // Coût = chute
        maxQuantity: quantity
      });
      patternIndex++;
    });
  });
  return {
    variables: variables,
    ints: ints,
    patterns: allPatterns,
    totalPatterns: patternIndex
  };
}

/**
 * NOUVELLE FONCTION: Génération optimisée des patterns avec élagage intelligent
 */
function generateOptimizedPatterns(barSize, cuts, bladeSize) {
  var maxPatterns = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 100;
  console.log("        \uD83C\uDFAF G\xE9n\xE9ration optimis\xE9e pour barre ".concat(barSize, "mm (max ").concat(maxPatterns, " patterns)"));
  var patterns = [];
  var seen = new Set();
  var startTime = Date.now();

  // Trier les coupes par efficacité décroissante
  var sortedCuts = Integer_Linear_Programming_toConsumableArray(cuts).sort(function (a, b) {
    return b - a;
  });

  // Paramètres adaptatifs selon le nombre de patterns générés
  var minEfficiency = 0.3; // Efficacité minimum initiale (30%)
  var maxDepth = 12; // Profondeur maximale initiale

  // Génération avec élagage par efficacité et profondeur limitée
  function generateWithPruning(remaining, current) {
    var depth = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
    // Limites de performance adaptatifs
    if (depth > maxDepth || patterns.length >= maxPatterns) return;

    // Élagage par efficacité minimum (adaptatif)
    var currentEfficiency = current.length > 0 ? current.reduce(function (sum, cut) {
      return sum + cut;
    }, 0) / barSize : 0;
    if (currentEfficiency > 0 && currentEfficiency < minEfficiency) return;

    // Éviter les doublons
    var patternKey = Integer_Linear_Programming_toConsumableArray(current).sort(function (a, b) {
      return a - b;
    }).join(',');
    if (seen.has(patternKey)) return;
    seen.add(patternKey);
    patterns.push(Integer_Linear_Programming_toConsumableArray(current));

    // Continuer la génération avec priorité aux grandes coupes
    var _iterator3 = Integer_Linear_Programming_createForOfIteratorHelper(sortedCuts),
      _step3;
    try {
      for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
        var cut = _step3.value;
        if (remaining >= cut) {
          generateWithPruning(remaining - cut, [].concat(Integer_Linear_Programming_toConsumableArray(current), [cut]), depth + 1);
        }
      }
    } catch (err) {
      _iterator3.e(err);
    } finally {
      _iterator3.f();
    }
  }

  // Première passe de génération
  generateWithPruning(barSize, []);

  // SI on a moins de patterns que souhaité et qu'on est en-dessous de 200 variables
  // alors on assouplit les contraintes pour générer plus de patterns
  if (patterns.length < Math.min(maxPatterns, 50)) {
    console.log("        \uD83D\uDD04 Premi\xE8re passe: ".concat(patterns.length, " patterns. Assouplissement des contraintes..."));

    // Réinitialiser pour une seconde passe plus permissive
    patterns.length = 0;
    seen.clear();

    // Assouplir les contraintes
    minEfficiency = 0.15; // Réduire l'efficacité minimum à 15%
    maxDepth = 18; // Augmenter la profondeur maximale

    // Nouvelle génération avec contraintes assouplies
    generateWithPruning(barSize, []);
    console.log("        \uD83D\uDCC8 Seconde passe: ".concat(patterns.length, " patterns g\xE9n\xE9r\xE9s"));
  }

  // SI on a encore trop peu de patterns, dernière passe très permissive
  if (patterns.length < Math.min(maxPatterns, 20)) {
    console.log("        \uD83D\uDD04 Encore insuffisant: ".concat(patterns.length, " patterns. Derni\xE8re passe permissive..."));

    // Réinitialiser pour une troisième passe très permissive
    patterns.length = 0;
    seen.clear();

    // Contraintes très permissives
    minEfficiency = 0.05; // Efficacité minimum très faible (5%)
    maxDepth = 25; // Profondeur très élevée

    // Génération finale très permissive
    generateWithPruning(barSize, []);
    console.log("        \uD83D\uDE80 Troisi\xE8me passe: ".concat(patterns.length, " patterns g\xE9n\xE9r\xE9s"));
  }

  // Trier par efficacité et garder seulement les meilleurs
  var rankedPatterns = patterns.map(function (pattern) {
    return {
      cuts: pattern,
      efficiency: pattern.reduce(function (sum, cut) {
        return sum + cut;
      }, 0) / barSize,
      waste: barSize - pattern.reduce(function (sum, cut) {
        return sum + cut;
      }, 0)
    };
  }).sort(function (a, b) {
    return b.efficiency - a.efficiency;
  }).slice(0, maxPatterns);
  var elapsedTime = Date.now() - startTime;
  console.log("        \u26A1 ".concat(rankedPatterns.length, " patterns finaux g\xE9n\xE9r\xE9s en ").concat(elapsedTime, "ms"));
  return rankedPatterns.map(function (p) {
    return p.cuts;
  });
}

/**
 * OPTIMISATION: Résolution ILP par étapes progressives POUR MAXIMISER L'EFFICACITÉ
 */
function solveAdvancedILPModel(cuttingPatterns, requiredCuts) {
  console.log("    \uD83E\uDDEE Construction du mod\xE8le ILP optimis\xE9 (objectif: minimiser les chutes):");
  var constraints = {};
  requiredCuts.forEach(function (_ref7) {
    var size = _ref7.size,
      count = _ref7.count;
    constraints["cut".concat(size)] = {
      equal: count
    };
    console.log("      \uD83D\uDCD0 Contrainte: exactement ".concat(count, " pi\xE8ces de ").concat(size, "mm"));
  });
  console.log("    \uD83D\uDCCA Mod\xE8le: ".concat(Object.keys(cuttingPatterns.variables).length, " variables, ").concat(Object.keys(constraints).length, " contraintes"));

  // OPTIMISATION: Résolution par étapes (logique inchangée mais objectif différent)
  var startTime = Date.now();
  console.log("    \u23F3 R\xE9solution progressive en cours (minimisation des chutes)...");
  var solution = null;
  var attempt = 1;

  // Étape 1: Essai avec les patterns les plus efficaces seulement
  try {
    console.log("    \uD83C\uDFAF Tentative ".concat(attempt, ": patterns haute efficacit\xE9"));
    var quickModel = buildOptimizedModel(cuttingPatterns, constraints, 0.7);
    solution = main_default().Solve(quickModel);
    if (solution && solution.feasible) {
      console.log("    \u2705 Solution trouv\xE9e \xE0 la tentative ".concat(attempt));
    } else {
      throw new Error("Pas de solution avec patterns haute efficacité");
    }
  } catch (error) {
    attempt++;

    // Étape 2: Essai avec efficacité moyenne
    try {
      console.log("    \uD83C\uDFAF Tentative ".concat(attempt, ": patterns efficacit\xE9 moyenne"));
      var mediumModel = buildOptimizedModel(cuttingPatterns, constraints, 0.5);
      solution = main_default().Solve(mediumModel);
      if (solution && solution.feasible) {
        console.log("    \u2705 Solution trouv\xE9e \xE0 la tentative ".concat(attempt));
      } else {
        throw new Error("Pas de solution avec patterns efficacité moyenne");
      }
    } catch (error2) {
      attempt++;

      // Étape 3: Dernier recours avec tous les patterns
      console.log("    \uD83C\uDFAF Tentative ".concat(attempt, ": tous les patterns"));
      var fullModel = {
        optimize: "cost",
        // On minimise toujours "cost"
        opType: "min",
        // Mais maintenant cost = chute !
        variables: cuttingPatterns.variables,
        ints: cuttingPatterns.ints,
        constraints: constraints
      };
      solution = main_default().Solve(fullModel);
    }
  }
  var elapsedTime = Date.now() - startTime;
  console.log("    \u23F1\uFE0F R\xE9solution termin\xE9e en ".concat(elapsedTime, "ms (").concat(attempt, " tentatives)"));
  if (!solution || !solution.feasible) {
    console.log("    \u26A0\uFE0F Aucune solution faisable trouv\xE9e apr\xE8s ".concat(attempt, " tentatives"));
    throw new Error("Aucune solution ILP trouvée");
  }

  // NOUVEAU: Afficher les métriques d'efficacité optimisées
  console.log("    \u2705 Solution optimale trouv\xE9e: chute totale minimis\xE9e = ".concat(solution.result, "mm"));

  // Calculer les métriques globales d'efficacité
  var totalWasteOptimized = 0;
  var totalMotherBarLengthUsed = 0;
  var totalUsefulLength = 0;
  var _loop2 = function _loop2() {
    var _Object$entries3$_i = Integer_Linear_Programming_slicedToArray(_Object$entries3[_i3], 2),
      varName = _Object$entries3$_i[0],
      quantity = _Object$entries3$_i[1];
    if (varName.startsWith('stock') && quantity > 0) {
      var pattern = cuttingPatterns.patterns.find(function (p) {
        return p.varName === varName;
      });
      if (pattern) {
        var wasteThisPattern = pattern.wasteLength * quantity;
        var motherBarLengthThisPattern = pattern.motherBarLength * quantity;
        var usefulLengthThisPattern = (pattern.motherBarLength - pattern.wasteLength) * quantity;
        totalWasteOptimized += wasteThisPattern;
        totalMotherBarLengthUsed += motherBarLengthThisPattern;
        totalUsefulLength += usefulLengthThisPattern;
      }
    }
  };
  for (var _i3 = 0, _Object$entries3 = Object.entries(solution); _i3 < _Object$entries3.length; _i3++) {
    _loop2();
  }
  var globalEfficiency = totalMotherBarLengthUsed > 0 ? (totalUsefulLength / totalMotherBarLengthUsed * 100).toFixed(3) : 0;
  console.log("    \uD83D\uDCCA Efficacit\xE9 globale optimis\xE9e: ".concat(globalEfficiency, "% (").concat(totalUsefulLength, "mm utile / ").concat(totalMotherBarLengthUsed, "mm total)"));
  console.log("    \uD83D\uDDD1\uFE0F Chute totale optimis\xE9e: ".concat(totalWasteOptimized, "mm"));

  // Vérification des contraintes (inchangé)
  console.log("    \uD83D\uDD0D V\xE9rification des contraintes:");
  var _iterator4 = Integer_Linear_Programming_createForOfIteratorHelper(requiredCuts),
    _step4;
  try {
    for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
      var _step4$value = _step4.value,
        size = _step4$value.size,
        count = _step4$value.count;
      var totalProduced = 0;
      var _loop4 = function _loop4() {
        var _Object$entries6$_i = Integer_Linear_Programming_slicedToArray(_Object$entries6[_i6], 2),
          varName = _Object$entries6$_i[0],
          quantity = _Object$entries6$_i[1];
        if (varName.startsWith('stock') && quantity > 0) {
          var pattern = cuttingPatterns.patterns.find(function (p) {
            return p.varName === varName;
          });
          if (pattern && pattern.cuts["cut".concat(size)]) {
            totalProduced += pattern.cuts["cut".concat(size)] * quantity;
          }
        }
      };
      for (var _i6 = 0, _Object$entries6 = Object.entries(solution); _i6 < _Object$entries6.length; _i6++) {
        _loop4();
      }
      console.log("      \u2713 ".concat(size, "mm: ").concat(totalProduced, "/").concat(count, " pi\xE8ces (").concat(totalProduced >= count ? 'OK' : 'MANQUE', ")"));
      if (totalProduced < count) {
        throw new Error("Solution incompl\xE8te: ".concat(totalProduced, "/").concat(count, " pi\xE8ces de ").concat(size, "mm"));
      }
    }

    // Affichage des patterns sélectionnés (enrichi avec métriques d'efficacité)
  } catch (err) {
    _iterator4.e(err);
  } finally {
    _iterator4.f();
  }
  console.log("    \uD83D\uDCCB Patterns s\xE9lectionn\xE9s:");
  var totalBars = 0;
  var _loop3 = function _loop3() {
    var _Object$entries4$_i = Integer_Linear_Programming_slicedToArray(_Object$entries4[_i4], 2),
      varName = _Object$entries4$_i[0],
      quantity = _Object$entries4$_i[1];
    if (varName.startsWith('stock') && quantity > 0) {
      var pattern = cuttingPatterns.patterns.find(function (p) {
        return p.varName === varName;
      });
      if (pattern) {
        var cuts = [];
        for (var _i5 = 0, _Object$entries5 = Object.entries(pattern.cuts); _i5 < _Object$entries5.length; _i5++) {
          var _Object$entries5$_i = Integer_Linear_Programming_slicedToArray(_Object$entries5[_i5], 2),
            cutKey = _Object$entries5$_i[0],
            cutCount = _Object$entries5$_i[1];
          if (cutKey.startsWith('cut') && cutCount > 0) {
            var cutSize = parseInt(cutKey.replace('cut', ''));
            for (var i = 0; i < cutCount; i++) {
              cuts.push(cutSize);
            }
          }
        }
        var usedLength = cuts.reduce(function (sum, cut) {
          return sum + cut;
        }, 0);
        var waste = pattern.stockSize - usedLength;
        var efficiency = (usedLength / pattern.stockSize * 100).toFixed(1);
        console.log("      \u2022 ".concat(quantity, "\xD7 barre ").concat(pattern.stockSize, "mm: [").concat(cuts.join(', '), "] (").concat(efficiency, "% efficacit\xE9, ").concat(waste, "mm chute)"));
        totalBars += quantity;
      }
    }
  };
  for (var _i4 = 0, _Object$entries4 = Object.entries(solution); _i4 < _Object$entries4.length; _i4++) {
    _loop3();
  }
  console.log("    \uD83D\uDCE6 Total: ".concat(totalBars, " barres utilis\xE9es pour une efficacit\xE9 globale de ").concat(globalEfficiency, "%"));
  return {
    solution: solution,
    patterns: cuttingPatterns
  };
}

/**
 * NOUVELLE FONCTION: Construit un modèle ILP filtré par efficacité
 */
function buildOptimizedModel(cuttingPatterns, constraints) {
  var minEfficiency = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0.5;
  var filteredVariables = {};
  var filteredInts = {};

  // Filtrer les variables par efficacité
  var _loop5 = function _loop5() {
    var _Object$entries7$_i = Integer_Linear_Programming_slicedToArray(_Object$entries7[_i7], 2),
      varName = _Object$entries7$_i[0],
      varData = _Object$entries7$_i[1];
    var pattern = cuttingPatterns.patterns.find(function (p) {
      return p.varName === varName;
    });
    if (pattern) {
      // Calculer l'efficacité du pattern
      var usedLength = 0;
      for (var _i8 = 0, _Object$entries8 = Object.entries(pattern.cuts); _i8 < _Object$entries8.length; _i8++) {
        var _Object$entries8$_i = Integer_Linear_Programming_slicedToArray(_Object$entries8[_i8], 2),
          cutKey = _Object$entries8$_i[0],
          cutCount = _Object$entries8$_i[1];
        if (cutKey.startsWith('cut') && cutCount > 0) {
          var cutSize = parseInt(cutKey.replace('cut', ''));
          usedLength += cutSize * cutCount;
        }
      }
      var efficiency = usedLength / pattern.stockSize;

      // Inclure seulement si l'efficacité est suffisante
      if (efficiency >= minEfficiency) {
        filteredVariables[varName] = varData;
        filteredInts[varName] = cuttingPatterns.ints[varName];
      }
    }
  };
  for (var _i7 = 0, _Object$entries7 = Object.entries(cuttingPatterns.variables); _i7 < _Object$entries7.length; _i7++) {
    _loop5();
  }
  console.log("      \uD83D\uDD0D ".concat(Object.keys(filteredVariables).length, "/").concat(Object.keys(cuttingPatterns.variables).length, " variables conserv\xE9es (efficacit\xE9 \u2265 ").concat((minEfficiency * 100).toFixed(0), "%)"));
  return {
    optimize: "cost",
    opType: "min",
    variables: filteredVariables,
    ints: filteredInts,
    constraints: constraints
  };
}

/**
 * Calcule les statistiques globales (algorithme original)
 */
function calculateGlobalStatistics(results) {
  var totalBarsUsed = 0;
  var totalWaste = 0;
  var totalBarLength = 0;
  for (var model in results) {
    var modelResult = results[model];
    totalBarsUsed += modelResult.rawData.totalMotherBarsUsed;
    totalWaste += modelResult.rawData.wasteLength;
    var _iterator5 = Integer_Linear_Programming_createForOfIteratorHelper(modelResult.layouts),
      _step5;
    try {
      for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
        var layout = _step5.value;
        totalBarLength += layout.originalLength * layout.count;
      }
    } catch (err) {
      _iterator5.e(err);
    } finally {
      _iterator5.f();
    }
  }
  var utilizationRate = totalBarLength > 0 ? ((totalBarLength - totalWaste) / totalBarLength * 100).toFixed(3) : "100.000";
  return {
    utilizationRate: parseFloat(utilizationRate),
    totalBarsUsed: totalBarsUsed,
    totalWaste: totalWaste,
    totalBarLength: totalBarLength
  };
}
;// ./src/js/index.js
function js_regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return js_regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (js_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, js_regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, js_regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), js_regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", js_regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), js_regeneratorDefine2(u), js_regeneratorDefine2(u, o, "Generator"), js_regeneratorDefine2(u, n, function () { return this; }), js_regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (js_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function js_regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } js_regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { js_regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, js_regeneratorDefine2(e, r, n, t); }
function js_asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function js_asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { js_asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { js_asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
// Importer les fichiers CSS
 // NOUVEAU: Importer en premier






// Importer tous les modules nécessaires










// Importer les algorithmes



// Export algorithms for the algorithm service
var algorithms = {
  solveGreedyFFD: solveGreedyFFD,
  solveWithILP: solveWithILP
};

// Export parser for the import manager


// NOUVEAU: Initialiser le thème très tôt
function initializeEarlyTheme() {
  // MODIFIÉ: Ne plus utiliser localStorage, toujours partir du système
  var html = document.documentElement;

  // Supprimer toutes les classes de thème existantes
  html.classList.remove('dark-theme', 'light-theme');

  // Appliquer le thème selon les préférences système
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    html.classList.add('dark-theme');
    console.log('🌙 Thème système: dark');
  } else {
    html.classList.add('light-theme');
    console.log('☀️ Thème système: light');
  }
}

// Initialiser le thème avant même le DOM
initializeEarlyTheme();

// Initialiser l'application
document.addEventListener('DOMContentLoaded', /*#__PURE__*/js_asyncToGenerator(/*#__PURE__*/js_regenerator().m(function _callee() {
  var _t;
  return js_regenerator().w(function (_context) {
    while (1) switch (_context.p = _context.n) {
      case 0:
        console.log('🚀 Chargement de l\'application...');
        _context.p = 1;
        _context.n = 2;
        return UIController.init();
      case 2:
        console.log('✅ Application prête');
        _context.n = 4;
        break;
      case 3:
        _context.p = 3;
        _t = _context.v;
        console.error('❌ Erreur fatale:', _t);
      case 4:
        return _context.a(2);
    }
  }, _callee, null, [[1, 3]]);
})));

// Exposer certains modules pour le debug en développement
if (false) // removed by dead control flow
{}
})();

/******/ })()
;