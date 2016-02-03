/**
 * jQuery Plugin to utilize a colorpicker
 *
 * @author Silvano Allemekinders
 * @licence Licensed under the MIT license
 */
(function ($)
{



    //define all settings possible, and their default value
    var settings = {
        searchKeys : [], //keys from the filterData array
        prioritySystem : 'logical', //logical, closest, match, alphabetical, customKey
        filterData : [], //data to filter through
        shadowData : [],
        minKeyLength : 0, //int
        dynamicDataSource : false,
        callback:  false,
        outputFormat : 'original', //TODO: full , keysOnly,
        customSortKey : false,
        suggestionThreshold : 48,
        html  : true,
        results : false
    };

    var newSettings;

    /**
     * Constructor of our searchFilter class
     * @constructor
     */
    function CdxSearch(object,settings)
    {
        this.settings = settings;
        //console.log(this.settings);
        this.$input = $(object);
        this.$value = this.$input.val();
        this.filterData = this.settings.filterData;
        //apply event handlers
        this.$input.on('keyup',$.proxy(this.keyUpEventHandler,this));
        this.outputData = [];
        this.matches=[];
        this.matches['results'] = [];
        this.matches['probability'] = [];
        this.suggestions=[];
        this.suggestions['results']=[];
        this.suggestions['probability']=[];
        this.$template = this.settings.results.html();
        this.$results = this.settings.results;
        this.settings.results.html("");
        this.html = this.settings.html;
        this.searchKeys = this.settings.searchKeys;
        this.callback = this.settings.callback;

    }

    /**
     * EventHandler on the element supplied
     * @EventHandler
     * @param e
     */
    CdxSearch.prototype.keyUpEventHandler = function(e)
    {
        this.$value = this.$input.val();
        this.refreshData();
        this.filter();

    };

    /**
     * refresh data source(s)
     * return @Boolean
     */
    CdxSearch.prototype.refreshData = function ()
    {
        // if we have a dynamic Data Source
        if(this.settings.dynamicDataSource)
        {
            this.filterData = this.settings.dynamicDataSource();
            //console.log("received : ",this.filterData);
            return true;
        }
        else{
            return false;
        }

    };

    CdxSearch.prototype.finalize = function ()
    {
        if(this.html) {
            //console.log("do stuff");
            this.doHTMLStuff();
        }
        if(this.callback) {
            this.callback(this.outputData);
        }
    };

    /**
     * check on which search Protocol we need to go.
     * return @Void
     */
    CdxSearch.prototype.filter = function ()
    {
        this.matches['results'] = [];
        this.matches['probability'] = [];

        this.suggestions['results']=[];
        this.suggestions['probability']=[];

        switch( this.settings.prioritySystem.toLowerCase())
        {
            case 'logical' :
                this.logicalSearch();
                break;
            case 'closest' :
                this.closestSearch();
                break;
            case 'match' :
                this.matchSearch();
                break;
            default:
                logicalSearch();
                break;
        }

    };

    /**
     * we will search using a simple, standard method,
     * which will return everything that
     * returns @Void
     * chains @this.sort
     */
    CdxSearch.prototype.logicalSearch = function()
    {
        for(key in this.filterData)
        {
            // Loop through each seperate array key
            for (secKey in this.filterData[key])
            {
                // Check if not an array
                if( typeof this.filterData[key][secKey] === 'string')
                {
                    if(this.isSearchable(secKey)) {
                        // Search for this.orginalData in curKey
                        if (this.filterData[key][secKey].toLowerCase().search(this.$value.toLowerCase()) >= 0) {
                            // Push results to results variable
                            this.matches['results'][key] = this.filterData[key];
                            if (this.matches['probability'][key]) {
                                if (this.matches.probability[key] > this.getDistance(this.filterData[key][secKey], this.$value)) {
                                    //console.log('hier');
                                    this.matches['probability'][key] = this.getDistance(this.filterData[key][secKey], this.$value);
                                }
                            } else {
                                this.matches['probability'][key] = this.getDistance(this.filterData[key][secKey], this.$value);
                            }
                        }else{
                            //if under suggestion threshold push it to suggestions
                            if (this.getDistance(this.filterData[key][secKey], this.$value)-50 > this.settings.suggestionThreshold)
                            {
                                this.suggestions['results'][key] = this.filterData[key];
                                this.suggestions['probability'][key] = this.getDistance(this.filterData[key][secKey], this.$value)-50;
                            }
                        }
                    }
                }
            }
        }
        this.sort();
    };

    /**
     * sort our data
     * chain@Finalize
     * returns@void
     */
    CdxSearch.prototype.sort = function() {

        this.stitch();

        this.stitched['matches'] = this.stitched['matches'].sort(this.probabilitySort);
        this.stitched['suggestions'] = this.stitched['suggestions'].sort(this.probabilitySort);

        this.outputData = this.stitched;
        this.finalize();
    };

    /**
     * sort based on probability
     * @param a
     * @param b
     * @returns {number}
     */
    CdxSearch.prototype.probabilitySort = function (b, a) {
        if (a[1] === b[1]) {
            return 0;
        }
        else {
            return (a[1] < b[1]) ? -1 : 1;
        }
    };
    /**
     * stitch 2 arrays together into 1 multidimensional sortable array
     */
    CdxSearch.prototype.stitch = function()
    {
        this.stitched = [];
        this.stitched['matches'] = [];
        this.stitched['suggestions'] = [];


        for ( i in this.matches['results'] )
        {
            this.stitched['matches'].push([this.matches['results'][i],this.matches['probability'][i]]);
        }

        for( i in this.suggestions['results'])
        {
            this.stitched['suggestions'].push([this.suggestions['results'][i],this.suggestions['probability'][i]]);
        }
    };
    /**
     * one of our sort functions, sorting on probability
     * @param a
     * @param b
     * @returns {number}
     */

    /**
     * use levenshtein's distance to determine close relatives in the search protocol
     * @param a
     * @param b
     * @returns {*}
     */
    CdxSearch.prototype.getDistance = function(a,b)
    {
        a = a.toLowerCase();
        b = b.toLowerCase();

        if(a.length == 0) return b.length;
        if(b.length == 0) return a.length;

        var matrix = [];

        // increment along the first column of each row
        var i;
        for(i = 0; i <= b.length; i++){
            matrix[i] = [i];
        }

        // increment each column in the first row
        var j;
        for(j = 0; j <= a.length; j++){
            matrix[0][j] = j;
        }

        // Fill in the rest of the matrix
        for(i = 1; i <= b.length; i++){
            for(j = 1; j <= a.length; j++){
                if(b.charAt(i-1) == a.charAt(j-1)){
                    matrix[i][j] = matrix[i-1][j-1];
                } else {
                    matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
                        Math.min(matrix[i][j-1] + 1, // insertion
                            matrix[i-1][j] + 1)); // deletion
                }
            }
        }

        return (100 - matrix[b.length][a.length]);

    };

    /**
     * check if the key supplied is in the array of keys
     * we need to search through
     *
     * @param key
     * @returns {boolean}
     */
    CdxSearch.prototype.isSearchable = function(key)
    {
        if(this.searchKeys.length == 0)
            return true;

        return $.inArray(key, this.searchKeys) > -1;
    };


    /**
     * scans through a text string for variables, reads data from those variables and returns a new string
     */
    CdxSearch.prototype.scanVariables = function ($string,data)
    {
        text = $string;
        inVar = false;
        matches = [];
        matchCounter = -1;
        counter = 0;
        newText = "";

        for(i in text)
        {
            if(text[i] == "{")
            {
                counter++;
                if(counter == 2 )
                {
                    inVar = true;
                    matchCounter++;
                    matches[matchCounter] = "";
                    counter = 0;
                }
            }else if(inVar)
            {
                if(text[i]=="}")
                {
                    counter++;
                    if(counter ==2)
                    {
                        varData = "";

                        if(splitted = matches[matchCounter].split('.'))
                        {
                            getData = data[0];
                            for (key in splitted)
                            {
                                console.log
                                getData = getData[splitted[key]];
                            }
                            newText += getData;
                        }
                        else{
                            newText += data[0][matches[matchCounter]];
                        }
                        counter =0;
                        inVar = false;

                    }
                }else{
                    matches[matchCounter] += text[i];
                }
            }else{
                newText+= text[i];
            }
        }


        return newText;
    };

    CdxSearch.prototype.doHTMLStuff = function()
    {
        console.log(this.results);

        this.$results.html("");
        for( i in this.outputData['matches'])
        {

            this.$results.append(this.scanVariables(this.$template,this.outputData['matches'][i]));



        }

    };

    /**
     * Actual plugin call from the outside world
     *
     * @param options
     *  colorPreview:   default: true,
     *
     * @returns {*}
     */
    $.fn.cdxSearch = function (options)
    {
        newSettings = settings;
        if (options) {
            newSettings = $.extend(settings, options);
        }


        if (!this.coduxSearchArray)
        {
            this.coduxSearchArray = [];
        }
        this.coduxSearchArray.push(new CdxSearch(this,newSettings));



        //Return this for jQuery chaining
        return this;
    };
})(jQuery);


//TODO: pass on which key something is found
//TODO: implement different sort types
//TODO: implement different return types
//TODO: Optional HTML generating
//TODO: implement suggestions