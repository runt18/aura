/*
 * Copyright (C) 2013 salesforce.com, inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/*jslint sub: true */
/**
 * @class ComponentDef
 *
 * Constructs a new ComponentDef object, which is a component definition.
 * A ComponentDef instance is created as part of Aura initialization.
 *
 * @constructor
 * @protected
 */
function ComponentDef(config) {
    var descriptor = new DefDescriptor(config["descriptor"]);
    this.descriptor = descriptor;
    if (config["hasServerDeps"]) {
        this.hasRemoteDeps = true;
    }
    this.access=config[Json.ApplicationKey.ACCESS];
    delete config[Json.ApplicationKey.ACCESS];

    this.superDef = this.initSuperDef(config["superDef"]);
    this.styleDef = config["styleDef"] ? new StyleDef(config["styleDef"]) : undefined;

    this.controllerDef = config["controllerDef"] ? $A.componentService.createControllerDef(config["controllerDef"]) : undefined;
    this.modelDef = config["modelDef"] ? $A.componentService.createModelDef(config["modelDef"]) : undefined;
    this.methodDefs = config["methodDefs"] ? config["methodDefs"]: undefined;

    // Initialize the concrete component class if provided
    var componentClassDef = config["componentClass"];
    if(componentClassDef && !$A.componentService.hasComponentClass(config["descriptor"])) {
    	componentClassDef = $A.util.json.decode(componentClassDef);
    	componentClassDef();
    }

    this.interfaces = {};
    var intfConfig = config["interfaces"];
    if (intfConfig) {
        for (var m = 0; m < intfConfig.length; m++) {
            var intf = new DefDescriptor(intfConfig[m]);
            var intfName = intf.getNamespace() + ":" + intf.getName();
            this.interfaces[intfName] = true;
        }
    }

    var appHandlerDefs;
    var cmpHandlerDefs;
    var valueHandlerDefs;

    this.facets = config["facets"];
    this.isAbs = !!config["isAbstract"];
    if (config["layouts"]) {
        this.layouts = new LayoutsDef(config["layouts"]);
    } else {
        this.layouts = null;
    }

    if (config["locationChangeEventDef"]) {
        this.locationChangeEventDef = $A.eventService.createEventDef(config["locationChangeEventDef"]);
    } else {
        this.locationChangeEventDef = null;
    }

    var registerEventDefs = {};
    this.registerEventDefs = registerEventDefs;
    var allEvents = [];
    this.allEvents = allEvents;
    var cred = config["registerEventDefs"];
    if (cred) {
        for (var i = 0; i < cred.length; i++) {
            var regConfig = cred[i];
            var name = regConfig["attributeName"];
            allEvents.push(name);
            registerEventDefs[name] = $A.eventService.createEventDef(regConfig["eventDef"]);
        }
    }

    var handlerDefConfigs = config["handlerDefs"];
    if (handlerDefConfigs) {
        for (var j = 0; j < handlerDefConfigs.length; j++) {
            var handlerConfig = handlerDefConfigs[j];
            if (handlerConfig["eventDef"]) {
                // We cannot modify handlerConfig directly, as it is sometimes stored in localStorage.
                // and the json serialize-deserialize loses the object prototype.
                if (handlerConfig.name) {
                    if (!cmpHandlerDefs) {
                        cmpHandlerDefs = [];
                    }
                    cmpHandlerDefs.push({
                        "name"     : handlerConfig["name"],
                        "action"   : handlerConfig["action"],
                        "eventDef" : $A.eventService.createEventDef(handlerConfig["eventDef"])
                    });
                } else {
                    if (!appHandlerDefs) {
                        appHandlerDefs = [];
                    }
                    appHandlerDefs.push({
                        "action"   : handlerConfig["action"],
                        "eventDef" : $A.eventService.createEventDef(handlerConfig["eventDef"])
                    });
                }

            } else if (handlerConfig["value"]) {
                if (!valueHandlerDefs) {
                    valueHandlerDefs = [];
                }
                valueHandlerDefs.push(handlerConfig);
            } else {
                if (!cmpHandlerDefs) {
                    cmpHandlerDefs = [];
                }
                cmpHandlerDefs.push(handlerConfig);
            }

        }
    }
    var subDefs = config["subDefs"];
    if (subDefs) {
        for (var k = 0; k < subDefs.length; k++) {
            $A.componentService.getDef(subDefs[k]);
        }
    }

    var imports = config["imports"];
    if (imports) {
        this.libraryDefs = {};
        var imp, lib;
        for (var l = 0, len = imports.length; l < len; l++) {
            imp = imports[l];
            if (imp["libraryDef"]) {
                lib = $A.componentService.createLibraryDef(imp["libraryDef"]);
            } else {
                lib = $A.componentService.getLibraryDef(imp["name"]);
            }
            this.libraryDefs[imp["property"]] = lib;
        }
    }

    this.appHandlerDefs = appHandlerDefs || null;
    this.cmpHandlerDefs = cmpHandlerDefs || null;
    this.valueHandlerDefs = valueHandlerDefs || null;
    this.isCSSPreloaded = config["isCSSPreloaded"] || false;

    if (config["defaultFlavor"]) {
        this.defaultFlavor = config["defaultFlavor"];
    }
    if (config["hasFlavorableChild"]) {
        this.flavorableChild = true;
    }

    if (config["defaultFlavors"]) { // for applications
        this.defaultFlavors = new FlavorAssortmentDef(config["defaultFlavors"]);
    } else {
        this.defaultFlavors = null;
    }

    this.attributeDefs = new AttributeDefSet(config["attributeDefs"],this.descriptor.getNamespace());
    this.requiredVersionDefs = new RequiredVersionDefSet(config["requiredVersionDefs"]);

    this.rendererDef = $A.componentService.createRendererDef(descriptor.getQualifiedName());
    this.initRenderer();

    this.helperDef = $A.componentService.createHelperDef(this, this.libraryDefs);

    var providerDef = config["providerDef"];
    if (providerDef) {
        this.providerDef = $A.componentService.createProviderDef(descriptor.getQualifiedName(), providerDef);
    } else {
        this.providerDef = null;
    }
}

ComponentDef.prototype.auraType = "ComponentDef";

/**
 * Returns a DefDescriptor object.
 *
 * @returns {DefDescriptor} A DefDescriptor object contains a prefix, namespace,
 *          and name.
 */
ComponentDef.prototype.getDescriptor = function() {
    return this.descriptor;
};

/**
 * Checks whether the Component is abstract. Returns true if the component is
 * abstract.
 *
 * @returns {Boolean} True if component is abstract, or false otherwise.
 */
ComponentDef.prototype.isAbstract = function() {
    return this.isAbs;
};

/**
 * Returns the component definition for the immediate super type or null if none
 * exists (should only be null for aura:component).
 *
 * @return {ComponentDef} The ComponentDef for the immediate super type
 */
ComponentDef.prototype.getSuperDef = function() {
    return this.superDef;
};

/**
 * Returns a HelperDef object.
 *
 * @returns {HelperDef}
 */
ComponentDef.prototype.getHelperDef = function() {
    return this.helperDef;
};

/**
 * Gets the Helper instance
 *
 * @returns {Helper}
 */
ComponentDef.prototype.getHelper = function() {
    var def = this.getHelperDef();
    if (def) {
        return def.getFunctions();
    }
    return def;
};

/**
 * Returns a RendererDef object.
 *
 * @returns {RendererDef}
 */
ComponentDef.prototype.getRendererDef = function() {
    return this.rendererDef;
};

/**
 * Returns RequiredVersionDef objects.
 *
 * @returns {RequiredVersionDefs}
 */
ComponentDef.prototype.getRequiredVersionDefs = function() {
    return this.requiredVersionDefs;
};

/**
 * Checks whether the component has remote dependencies. Returns true if remote
 * dependencies are found.
 *
 * @returns {Boolean} True if remote dependencies exist, or false otherwise.
 */
ComponentDef.prototype.hasRemoteDependencies = function() {
    return this.hasRemoteDeps;
};

/**
 * @private
 */
ComponentDef.prototype.getRenderingDetails = function() {
    return this.renderingDetails;
};

/**
 * Returns a ProviderDef object associated with this ComponentDef.
 *
 * @returns {ProviderDef}
 */
ComponentDef.prototype.getProviderDef = function() {
    return this.providerDef;
};

/**
 * Gets all the StyleDef objects, including inherited ones, for this
 * ComponentDef.
 *
 * @returns {StyleDef}
 */
ComponentDef.prototype.getAllStyleDefs = function() {
    return this.allStyleDefs;
};

/**
 * Gets the CSS class name to use for Components of this type. Includes the
 * class names from all StyleDefs, including inherited ones, associated with
 * this ComponentDef. If multiple class names are found, the return value is a
 * space-separated list of class names. This string can be applied directly to
 * DOM elements rendered by Components of this type.
 *
 * @returns {String} The style class name
 */
ComponentDef.prototype.getStyleClassName = function() {
    var className = this.styleClassName;
    if (!className) {
        className = "";
        var styleDefs = this.getAllStyleDefs();
        if (styleDefs) {
            var styleDefLen = styleDefs.length;
            for (var t = 0; t < styleDefLen; t++) {
                var styleDef = styleDefs[t];
                className = className + styleDef.getClassName() + " ";
                // Preloaded CSS should already be included in app.css
                if (!this.isCSSPreloaded) {
                    styleDef.apply();
                }
            }

        }
        this.styleClassName = className;
    }
    return className;
};

/**
 * Gets the style definition. Returns a StyleDef object.
 *
 * @returns {StyleDef}
 */
ComponentDef.prototype.getStyleDef = function() {
    return this.styleDef;
};

/**
 * Gets the default flavor name, either from app-specified overrides or the
 * default specified on the component def.
 *
 * @returns {String} The flavor, e.g., "default" or "xyz.flavors.default", etc...
 */
ComponentDef.prototype.getDefaultFlavor = function() {
    if ($A.util.isUndefined(this.flavorOverride)) {
        var override = null;

        var appDesc = $A.getContext().getApp();
        if (appDesc) {
            var appDef = $A.componentService.getDef(appDesc, true);
            if (appDef) { // might be null if there's a problem loading the app
                var defaults = appDef.getDefaultFlavors();
                if (defaults) {
                    override = defaults.getFlavor(this.descriptor);
                    if (override === "{!remove}") {
                        override = "";
                    }
                }
            }
        }

        this.flavorOverride = $A.util.isUndefinedOrNull(override) ? null : override;
    }

    return !$A.util.isUndefinedOrNull(this.flavorOverride) ? this.flavorOverride : this.defaultFlavor;
};

/**
 * Gets whether this def has at least one flavorable child element.
 *
 * @returns {Boolean}
 */
ComponentDef.prototype.hasFlavorableChild = function() {
    return !!this.flavorableChild;
};

/**
 * Gets the set of default flavor overrides.
 *
 * @returns {FlavorAssortmentDef}
 */
ComponentDef.prototype.getDefaultFlavors = function() {
    return this.defaultFlavors;
};

/**
 * Gets all the attribute definitions. Returns an AttributeDef object.
 *
 * @returns {AttributeDefSet}
 */
ComponentDef.prototype.getAttributeDefs = function() {
    return this.attributeDefs;
};

/**
 * Gets the component facets. A facet is any attribute of type Aura.Component[].
 *
 * @returns {Object}
 */
ComponentDef.prototype.getFacets = function() {
    return this.facets;
};

/**
 * Gets the controller definition. Returns a ControllerDef object.
 *
 * @returns {ControllerDef}
 */
ComponentDef.prototype.getControllerDef = function() {
    return this.controllerDef;
};

/**
 * Gets the model definition. Returns a ModelDef object.
 *
 * @returns {ModelDef}
 */
ComponentDef.prototype.getModelDef = function() {
    return this.modelDef;
};

/**
 * Value Event Enum
 *
 * @returns {ModelDef}
 */
ComponentDef.valueEvents = {
    "change" : "aura:valueChange",
    "init" : "aura:valueInit",
    "destroy" : "aura:valueDestroy"
};

/**
 * Returns the event definitions.
 *
 * @param {String}
 *            The name of the event definition.
 * @param {Boolean}
 *            includeValueEvents Set to true to include the value events.
 * @returns{Object}
 */
ComponentDef.prototype.getEventDef = function(name, includeValueEvents) {
    var ret = this.registerEventDefs[name];
    if (!ret && includeValueEvents) {
        if (ComponentDef.valueEvents.hasOwnProperty(name)) {
            name = ComponentDef.valueEvents[name];
        }
        ret=$A.get("e").getEventDef(name);
    }
    return ret;
};

/**
 * Get an event name by descriptor qualified name.
 *
 * This is only used in the case of an action firing a component event. It is a
 * bit of a hack, but will give back the name of the event that corresponds to
 * the descriptor.
 *
 * @param {String}
 *            descriptor a descriptor qualified name.
 * @return {String} null, or the component fired event name.
 * @protected
 */
ComponentDef.prototype.getEventNameByDescriptor = function(descriptor) {
    for (var name in this.registerEventDefs) {
        if (this.registerEventDefs[name] && this.registerEventDefs[name].descriptor && this.registerEventDefs[name].descriptor.qualifiedName === descriptor) {
            return name;
        }
    }
    return null;
};

/**
 * Gets all events associated with the Component.
 *
 * @returns {Object}
 */
ComponentDef.prototype.getAllEvents = function() {
    return this.allEvents;
};

/**
 * Gets the application handler definitions.
 *
 * @returns {Object}
 */
ComponentDef.prototype.getAppHandlerDefs = function() {
    return this.appHandlerDefs;
};

/**
 * Gets the component handler definitions.
 *
 * @returns {Object}
 */
ComponentDef.prototype.getCmpHandlerDefs = function() {
    return this.cmpHandlerDefs;
};

/**
 * Gets the value of the handler definitions.
 *
 * @returns {Object}
 */
ComponentDef.prototype.getValueHandlerDefs = function() {
    return this.valueHandlerDefs;
};

/**
 * Converts a ComponentDef object to type String.
 *
 * @returns {String}
 */
ComponentDef.prototype.toString = function() {
    return this.getDescriptor().getQualifiedName();
};

/**
 * Checks whether the Component is an instance of the given component name (or
 * interface name).
 *
 * @param {String}
 *            name The name of the component (or interface), with a format of
 *            <code>namespace:componentName</code> (e.g.,
 *            <code>ui:button</code>).
 * @returns {Boolean} True if the Component is an instance, or false otherwise.
 */
ComponentDef.prototype.isInstanceOf = function(name) {
    var thisName = this.descriptor.getNamespace() + ":" + this.descriptor.getName();
    if (thisName === name || this.implementsDirectly(name)) {
        return true;
    }
    if (this.superDef) {
        return this.superDef.isInstanceOf(name);
    }
    return false;
};

/**
 * Primarily used by isInstanceOf().
 *
 * @private
 */
ComponentDef.prototype.implementsDirectly = function(type) {
    return !$A.util.isUndefined(this.interfaces[type]);
};

/**
 * Gets the location change event. Returns the qualified name of the event in
 * the format <code>markup://aura:locationChange</code>.
 */
ComponentDef.prototype.getLocationChangeEvent = function() {
    var evt = this.locationChangeEventDef;
    if (evt) {
        return evt.getDescriptor().getQualifiedName();
    }
    return "markup://aura:locationChange";
};

ComponentDef.prototype.getLayouts = function() {
    return this.layouts;
};

/**
 * @private
 */
ComponentDef.prototype.initSuperDef = function(config) {
    if (config) {
        var descriptor = config;
        if (config["descriptor"]) {
            descriptor = config["descriptor"];
        }
        // config could either be for a new component or for an existing def so we need to check first
        var sDef = $A.componentService.registry.getDef(descriptor);
        if (!sDef) {
            sDef = $A.componentService.registry.createDef(config);
        }
        $A.assert(sDef, "Super def undefined for " + this.descriptor + " value = " + descriptor);
        return sDef;
    }
    return null;
};

/**
 * Setup the style defs and renderer details.
 *
 * Note that the style defs are in reverse order so that they get applied in
 * forward order.
 *
 * @private
 */
ComponentDef.prototype.initRenderer = function() {
    var rd = {
        distance : 0,
        rendererDef : this.rendererDef
    };
    this.allStyleDefs = [];
    var s = this.superDef;
    if (s) {
        if (!this.rendererDef) {
            // no rendererdef, get the superdefs
            var superStuff = s.getRenderingDetails();
            if (superStuff) {
                rd.rendererDef = superStuff.rendererDef;
                rd.distance = superStuff.distance + 1;
            }
        }
        var superStyles = s.getAllStyleDefs();
        if (superStyles) {
            this.allStyleDefs = this.allStyleDefs.concat(superStyles);
        }
    }
    if (this.styleDef) {
        this.allStyleDefs.push(this.styleDef);
    }
    if (!rd.rendererDef) {
        //
        // If we don't have a renderer, make sure we mark that here. Note
        // that we can't assert that we have a renderer, because sometimes
        // there are component defs that don't, maybe the server shouldn't
        // send them down, as they cannot be instantiated on the client.
        //
        rd = undefined;
    }
    this.renderingDetails = rd;
};

Aura.Component.ComponentDef = ComponentDef;

// #include aura.component.ComponentDef_export
