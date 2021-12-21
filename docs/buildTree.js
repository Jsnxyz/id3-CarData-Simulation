$(function(){
    var classes_list = ["unacc","acc","good","vgood"];
    var total_instance = 0;
    var carData = [];
    var treeModel;
    var level = 0;
    var levelCounter = 1;
    var nodeNo = 0;
    var treeModelCurrent = {};
    var features = ["buying","maint","doors","persons","lug_boot","safety"];
    var features_value = {
        "buying" : [{"vhigh" : [], "high" : [], "med" : [], "low" : []}],
        "maint" : [{"vhigh" : [], "high" : [], "med" : [], "low" : []}],
        "doors" : [{"2" : [], "3" : [], "4" : [], "5more" : []}],
        "persons" : [{"2" : [], "4" : [], "more":[]}],
        "lug_boot" : [{"small" : [], "med" : [], "big" : []}],
        "safety" : [{"low" : [], "med" : [], "high" : []}]
    };
    $.get("car.data",function(trainingSet){
        var trainingEx = trainingSet.split("\n");
        total_instance = trainingEx.length;
        for(var i=0;i<total_instance;i++){
            var tempData = trainingEx[i].split(","); 
            var data = {
                "buying" : tempData[0],
                "maint" : tempData[1],
                "doors" : tempData[2],
                "persons" : tempData[3],
                "lug_boot" : tempData[4],
                "safety" : tempData[5],
                "class" : tempData[6].trim()
            };
            carData.push(data);
        }
        treeModel = id3_algorithm(carData,features);
        var x = flattenObject(treeModel);
        var y = filterFlatObj(x);
        treeModelCurrent = controlUnflatten(y);
        buildTree("#tree-container");
        timeout();
    });
    function timeout() {
        setTimeout(function () {
            if(levelCounter < level){
              $(".next").click(); 
              timeout(); 
            }                           
        }, 1500);
    }
    $(".next").click(function(){
        ++levelCounter;
        var x = flattenObject(treeModel);
        var y = filterFlatObj(x);
        treeModelCurrent = controlUnflatten(y);
        update();
    });
    $(".skip").click(function(){
        levelCounter = level;
        treeModelCurrent = treeModel;
        update();
    });
    function filterFlatObj(obj){
        var res = {};
        for(var i in obj){
            if(obj[i] == "level" + levelCounter){
                res[i] = obj[i];
                break;
            } else {
                res[i] = obj[i];
            }
        }
        return res;
    }

    function flattenObject(ob) {
        var toReturn = {};
        
            for (var i in ob) {

                if (!ob.hasOwnProperty(i)) continue;
                
                if ((typeof ob[i]) == 'object') {
                    var flatObject = flattenObject(ob[i]);
                    for (var x in flatObject) {
                        if (!flatObject.hasOwnProperty(x)) continue;                       
                        toReturn[i + '.' + x] = flatObject[x];
                    }
                } else {
                    toReturn[i] = ob[i];
                    
                }
            }

        return toReturn;
    };
    function controlUnflatten(data) {

        "use strict";
        if (Object(data) !== data || Array.isArray(data))
            return data;
        var result = {}, cur, prop, parts, idx;
        for(var p in data) {
            cur = result, prop = "";
            parts = p.split(".");
            for(var i=0; i<parts.length; i++) {
                idx = !isNaN(parseInt(parts[i]));
                cur = cur[prop] || (cur[prop] = (idx ? [] : {}));
                prop = parts[i];
            }
            cur[prop] = data[p];
        }
        return result[""];
    }
    
    function id3_algorithm(trainingSets,featureSet){
        // Find if entropy is 0 or if only 1 feature is left.
        var set_class = find_classes(trainingSets);
        if(set_class.length == 1){
            return {"type":"result", "nodeNo" : ++nodeNo, "name": set_class[0],"contents": [], "entropy" : 0, "classes" : class_distribution(trainingSets) , "level" : "level" +  ++level};
        }
        var bestFeature = maxGain(trainingSets,featureSet);
        var remainingFeatureSet = remainingFeatures(bestFeature,featureSet);
        var possibleValue = possibleValues(bestFeature);
        var node = {"name" : bestFeature, "nodeNo" : ++nodeNo, "type" : "feature", "entropy" : entropy(trainingSets), "classes" : class_distribution(trainingSets), "level" : "level" +  ++level};
        node.contents = possibleValue.map(function(value){
            var subsets = getSubset(bestFeature,value,trainingSets);
            var child_node = {"name": value, "nodeNo" : ++nodeNo, "type" : "feature_value", "entropy" : entropy(subsets), "classes" : class_distribution(subsets)};
            child_node.contents = [];
            child_node.contents.push(id3_algorithm(subsets,remainingFeatureSet));
            return child_node;
        });
        return node;
    }
    function getSubset(best_feature, feature_val, trainingSets){
        var total_instance = trainingSets.length;
        var new_set = [];
        for(var i=0;i<total_instance;i++){
            if(trainingSets[i][best_feature] == feature_val){
                new_set.push(trainingSets[i]);
            }
        }
        return new_set;
    }
    function possibleValues(feature){
        var value_arr = [];
        var values = features_value[feature][0];
        for(key in values){
            value_arr.push(key);
        }
        return value_arr;
    }
    function find_classes(trainingSets){
        var class_arr = [];
        var total_instance = trainingSets.length;
        for(var i=0;i<total_instance;i++){
            if(class_arr.indexOf(trainingSets[i]["class"]) == -1){
                class_arr.push(trainingSets[i]["class"]);
            }
        }
        return class_arr;
    }
    function class_distribution(trainingSets){
        var classes = {"unacc" : 0 , "acc" : 0, "good" : 0, "vgood" : 0};
        var trainingSetEntropy = 0;
        var total_instance = trainingSets.length;
        for(var i=0;i<total_instance;i++){
            classes[trainingSets[i]["class"]]++;
        }
        var class_str = "";
        for(var cls in classes){
            class_str += cls + ":" + classes[cls];
        }
        return class_str;
    }
    function remainingFeatures(bestFeature,featureSet){
        var tempSet = [];
        for(var i=0;i<featureSet.length;i++){
            if(featureSet[i] != bestFeature){
                tempSet.push(featureSet[i]);
            }
        }
        return tempSet;
    }

    function maxGain(trainingSets,featureSet){
        var gains = [];
        var maxGain = 0;
        var maxGainSet;
        var S_entropy = entropy(trainingSets);
        for(var i=0;i<featureSet.length;i++){
            gains.push(gain(trainingSets,featureSet[i],S_entropy));
        }
        for(var i=0; i<gains.length;i++){
            if(gains[i]["info_gain"] > maxGain){
                maxGain = gains[i]["info_gain"];
                maxGainSet = gains[i];
            }
        }
        return maxGainSet["feature"];
    }

    function entropy(trainingSets){
        var classes = {"unacc" : 0 , "acc" : 0, "good" : 0, "vgood" : 0};
        var trainingSetEntropy = 0;
        var total_instance = trainingSets.length;
        for(var i=0;i<total_instance;i++){
            classes[trainingSets[i]["class"]]++;
        }
        for(var i=0;i<classes_list.length;i++){
            if(classes[classes_list[i]]){
                trainingSetEntropy += - (classes[classes_list[i]]/total_instance) * (Math.log(classes[classes_list[i]]/total_instance) / Math.log(4));
            }
        }
        return trainingSetEntropy;

    }
    function gain(trainingSets,feature,S_entropy){
        var gain_value = S_entropy;
        var values = features_value[feature][0];
        var total_instance = trainingSets.length;
        for(var i=0;i<total_instance;i++){
            values[trainingSets[i][feature]].push(trainingSets[i]);
        }
        for(feature_name in values){
            gain_value += - (values[feature_name].length/total_instance) * entropy(values[feature_name]);
        }
        features_value = {
        "buying" : [{"vhigh" : [], "high" : [], "med" : [], "low" : []}],
        "maint" : [{"vhigh" : [], "high" : [], "med" : [], "low" : []}],
        "doors" : [{"2" : [], "3" : [], "4" : [], "5more" : []}],
        "persons" : [{"2" : [], "4" : [], "more":[]}],
        "lug_boot" : [{"small" : [], "med" : [], "big" : []}],
        "safety" : [{"low" : [], "med" : [], "high" : []}]
        };
        return {"feature" : feature, "info_gain" : gain_value};
    }
    function visit(parent, visitFn, childrenFn)
    {
        if (!parent) return;

        visitFn(parent);

        var children = childrenFn(parent);
        if (children) {
            var count = children.length;
            for (var i = 0; i < count; i++) {
                visit(children[i], visitFn, childrenFn);
            }
        }
    }

    function buildTree(containerName, customOptions)
    {
        // build the options object
        options = $.extend({
            nodeRadius: 55, fontSize: 12
        }, customOptions);

        
        // Calculate total nodes, max label length
        totalNodes = 0;
        maxLabelLength = 0;
        visit(treeModelCurrent, function(d)
        {
            maxLabelLength = d.name.length;
        }, function(d)
        {
            return d.contents && d.contents.length > 0 ? d.contents : null;
        });

    

        tree = d3.layout.tree()
            .sort(null)
            .children(function(d)
            {
                return (!d.contents || d.contents.length === 0) ? null : d.contents;
            });

        //size of diagram
        update();
    }
    function update(){
        var sT = $(window).scrollTop();
        if( typeof layoutRoot !== 'undefined'){
            $("#tree-container").html("");
        }
        size = { width:$(window).width() - 30, height: Math.max(levelCounter * 15 || 0, $(window).height())};    
        tree.size([size.height, size.width - maxLabelLength*options.fontSize]);    
        nodes = tree.nodes(treeModelCurrent);
        links = tree.links(nodes);

        
        /*
            <svg>
                <g class="container" />
            </svg>
         */
        layoutRoot = d3.select("#tree-container")
            .append("svg:svg").attr("width", size.width).attr("height", size.height)
            .append("svg:g")
            .attr("class", "container")
            .attr("transform", "translate(" + maxLabelLength + ",0)");
            layoutRoot.selectAll("path,svg,.node,.link").remove();

        // Edges between nodes as a <path class="link" />
        link = d3.svg.diagonal()
            .projection(function(d)
            {
                return [d.y, d.x];
            });

        layoutRoot.selectAll("path.link")
            .data(links)
            .enter()
            .append("svg:path")
            .attr("class", "link")
            .attr("d", link);


        /*
            Nodes as
            <g class="node">
                <circle class="node-dot" />
                <text />
            </g>
         */
        nodeGroup = layoutRoot.selectAll("g.node")
            .data(nodes)
            .enter()
            .append("svg:g")
            .attr("class", "node")
            .attr("transform", function(d)
            {
                return "translate(" + d.y + "," + d.x + ")";
            });

        nodeGroup.append("svg:rect")
            .attr("class", function(d){
                if(d.type == "feature_value"){
                    return "node-attr";
                } else if(d.type == "result" && d.name == "unacc") {
                    return "node-unacc";
                } else if(d.type == "result" && d.name == "acc"){
                    return "node-acc";
                } else if(d.type == "result" && d.name == "good"){
                    return "node-good";
                } else if(d.type == "result" && d.name == "vgood"){
                    return "node-vgood";
                } else {
                    return "node-dot";
                }
            })
            .attr("width", 150)
            .attr("height", 19)
            .attr("entropy",function(d){
                return d.entropy;
            })
            .attr("class-dis",function(d){
                return d.classes;
            })
            .attr("y", -11)
            .attr("rx", 2)
            .attr("ry", 2);

        nodeGroup.append("svg:text")
            .attr("text-anchor","start")
            .attr("entropy",function(d){
                return d.entropy;
            })
            .attr("class-dis",function(d){
                return d.classes;
            })
            .attr("x",5)
            .attr("y",2)
            .text(function(d)
            {
                return d.name;
            });
        $("rect").each(function(){
            $(this).attr("width",$(this).siblings("text")[0].getClientRects()[0].width + 10);
        });
        $(".node-attr").each(function(){
            $(this).attr("width",$(this).siblings("text")[0].getClientRects()[0].width + 10);
        });
        //$(document).on("click","rect",function(){
        //    alert($(this).attr("entropy") + " " + $(this).attr("class-dis"));
        //});
        $("rect,text").click(function(){
            alert($(this).attr("entropy") + " " + $(this).attr("class-dis"));
        });
        $(window).scrollTop(sT);
    }

});
