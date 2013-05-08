/*
 *  Copyright (c) 2013 Michael Souza <contact@michael-souza.com>
 *  This source code is released under the MIT license. (http://opensource.org/licenses/MIT)
 */

(function(FindZilla, undefined) {
  /**
   * An object for managing the extension options.
   * @constructor
   */
  FindZilla.OptionsManager = function(storageManager) {
    /*
     * Private Members
     */
    var options;

    var DefaultOptions = Object.freeze({
      general : {
        alwaysDisplay : false,
        saveOnRefresh : true,
        saveOnClose : true
      },
      criteria : {
        searchText : "",
        matchCase : false,
        wholeWords : false
      },
      hotkey : {
        toggleEnable : false,
        toggleHotkey : "F"
      }
    });

    /*
     * Private Methods
     */
    function lookup(root, args) {
      var obj = root;

      if (!args || args.length == 0)
        return obj;

      for (var i = 0; i < args.length; i++) {
        var prop = args[i];

        if (obj && prop in obj && obj.hasOwnProperty(prop)) {
          var propValue = obj[prop];

          if (propValue !== undefined) {
            obj = propValue;
          } else {
            break;
          }
        } else {
          break;
        }
      }

      return obj;
    }

    /*
     * Public Methods
     */
    function getDefault() {
      return lookup(DefaultOptions, arguments);
    }

    function getOption() {
      return lookup(options, arguments);
    }

    function hasOption() {
      if (!options || !arguments || arguments.length == 0)
        return false;

      var obj = options;

      for (var i = 0; i < args.length; i++) {
        var prop = args[i];

        if (obj && prop in obj && obj.hasOwnProperty(prop)) {
          var propValue = obj[prop];

          if (propValue !== undefined) {
            obj = propValue;
          } else {
            return false;
          }
        } else {
          return false;
        }
      }

      return true;
    }

    function setOption(value) {
      if (value === undefined)
        return false;

      if (!options || arguments.length == 1) {
        options = value;

        save();

        return true;
      }

      var obj = options;
      var prop;

      var i = 1;

      for (; i < arguments.length - 1; i++) {
        prop = arguments[i];

        if (prop && prop in obj && obj.hasOwnProperty(prop)) {
          obj = obj[prop];
        } else {
          obj[prop] = {};
          obj = obj[prop];
        }
      }

      prop = arguments[i];
      obj[prop] = value;

      save();

      return true;
    }

    function save() {
      storageManager.saveData(FindZilla.OptionKey.ROOT, options);
    }

    function init() {
      storageManager.loadData(FindZilla.OptionKey.ROOT, function(data) {
        options = data;
      }, function() {
        storageManager.saveData(FindZilla.OptionKey.ROOT, DefaultOptions, function() {
          options = JSON.parse(JSON.stringify(DefaultOptions));
        });
      });
    }

    return {
      init : init,
      hasOption : hasOption,
      getDefault : getDefault,
      getOption : getOption,
      setOption : setOption,
      save : save
    };
  };

  /**
   * An object for managing the background page.
   * @constructor
   */
  FindZilla.BackgroundManager = function(storageManager) {
    var tabUrls = {};

    /*
     * Private Methods
     */
    function handleToggleResponse(response) {
      console.log("Received toggle response: " + JSON.stringify(response));
    }

    function handleToggleCommand(tabs) {
      var tab = tabs.first();

      sendToggleRequest(tab);  
    }
    
    function sendToggleRequest(tab) {
      if (!tab.url.isChromeUrl()) {
        chrome.tabs.sendMessage(tab.id, new FindZilla.Message(FindZilla.MessageType.TOGGLE, null), handleToggleResponse);
      } else if (tab.url.isExtensionUrl()) {
        chrome.commands.getAll(function(commands) {
          var data = $.grep(commands, function(command) {
            return command.name === FindZilla.CommandType.TOGGLE;
          }).first();

          chrome.tabs.sendMessage(tab.id, new FindZilla.Message(FindZilla.MessageType.COMMAND, data));
        });
      }
    }

    function sendLoadRequest(tabId) {
      storageManager.loadData(tabId.toString(), function(data) {
        chrome.tabs.sendMessage(tabId, new FindZilla.Message(FindZilla.MessageType.LOAD, data));
      });
    }

    function onCommand(command) {
      console.log("onCommand event received for message: ", command);

      switch (command) {
        case FindZilla.CommandType.TOGGLE:
          chrome.tabs.query({
            active : true,
            currentWindow : true
          }, handleToggleCommand);
          break;
        default:
          break;
      }
    }

    function handleSaveRequest(tab, data, callback) {
      storageManager.saveData(tab.id.toString(), data, function() {
        console.log("Saved critera for tab id: " + tab.id + "\n\t" + JSON.stringify(data));

        try {
          callback(items);
        } catch (e) {
          console.log("Unable to send response to save request from tab id: " + tab.id);
        }
      });
    }

    function onMessage(request, sender, sendResponse) {
      console.log((sender.tab ? "Received message from tab id: " + sender.tab.id : "Received message from extension id: " + chrome.i18n.getMessage("@@extension_id")) + "\n\t" + JSON.stringify(request));

      switch (request.type) {
        case FindZilla.MessageType.SAVE:
          handleSaveRequest(sender.tab, request.data, sendResponse);
          break;
        default:
          break;
      }

      return true;
    }

    function sendLoadRequest(tabId, data) {
      data.hotkey = optionsManager.getOption(FindZilla.OptionKey.HOTKEY);

      if (!data.hotkey)
        data.hotkey = optionsManager.getDefault(FindZilla.OptionKey.HOTKEY);

      chrome.tabs.sendMessage(tabId, new FindZilla.Message(FindZilla.MessageType.LOAD, data));
    }

    function sendDefaultLoadRequest(tabId, generalOptions, hotkeyOptions) {
      var criteria = optionsManager.getOption(FindZilla.OptionKey.CRITERIA);

      if (!criteria) {
        optionsManager.getDefault(FindZilla.OptionKey.CRITERIA);
      }

      var options = new FindZilla.TabData(generalOptions.alwaysDisplay, new FindZilla.Criteria(criteria.searchText, criteria.matchCase, criteria.wholeWords, FindZilla.Direction.CURRENT));

      // Send load message with current options to tab
      sendLoadRequest(tabId, options);
    }

    function handleTabLoaded(tabId, changeInfo, tab) {
      var general = optionsManager.getOption(FindZilla.OptionKey.GENERAL);

      if (!general) {
        general = optionsManager.getDefault(FindZilla.OptionKey.GENERAL);
      }

      var hotkey = optionsManager.getOption(FindZilla.OptionKey.HOTKEY);

      if (!hotkey) {
        hotkey = optionsManager.getDefault(FindZilla.OptionKey.HOTKEY);
      }

      // Attempt to load the saved tab data for the current tab when the tab is refreshed
      storageManager.loadData(tabId.toString(), function(data) {
        if (general.saveOnRefresh) {
          // Send load message for refreshed tab
          sendLoadRequest(tabId, data);
        } else {
          sendDefaultLoadRequest(tabId, general, hotkey);
        }
      },
      // Attempt to load the saved tab data for a reopened tab that was previously closed
      function() {
        storageManager.loadData(tab.url, function(data) {
          if (general.saveOnClose) {
            // Send load message for reopened tab
            sendLoadRequest(tabId, data);
          } else {
            sendDefaultLoadRequest(tabId, general);
          }
        },
        // Otherwise load the current/ default options in the new or current tab
        sendDefaultLoadRequest(tabId, general));
      });
    }

    function onUpdated(tabId, changeInfo, tab) {
      switch (changeInfo.status) {
        case 'loading':
          break;
        case 'complete':
          tabUrls[tabId] = tab.url;
          handleTabLoaded(tabId, changeInfo, tab);
          break;
        default:
          break;
      }
    }

    function onRemoved(tabId, removeInfo) {
      storageManager.loadData(tabId.toString(), function(data) {
        storageManager.removeData(tabId.toString(), function() {
          // Retrieve the last loaded url associated with the tab ID
          var key = tabUrls[tabId];

          if (!key) {
            return;
          }

          // Remove the tab url associated with the closed tab ID
          delete tabUrls[tabId];

          // Save the data associated with the tab url
          storageManager.saveData(key, data, function() {
            console.log("Saved critera for closed tab: " + key + "\n\t" + JSON.stringify(data));
          });
        });
      });
    }

    /*
     * Public Methods
     */
    function init() {
      // Clear local storage
      //storageManager.clearData();

      // Listen for browser action click events
      chrome.browserAction.onClicked.addListener(sendToggleRequest);

      // Listen for command events
      chrome.commands.onCommand.addListener(onCommand);

      // Listen for received messages from a content script.
      chrome.extension.onMessage.addListener(onMessage);

      // Listen for closed tabs
      chrome.tabs.onRemoved.addListener(onRemoved);

      // Listen for updated tabs
      chrome.tabs.onUpdated.addListener(onUpdated);

      // Reload open tabs
      chrome.tabs.query({}, function(allTabs) {
        $.each(allTabs, function(index, tab) {
          if (tab && !tab.url.isChromeUrl())
            chrome.tabs.reload(tab.id);
        });
      });
    }

    return {
      init : init
    };
  };

  // Check whether 'FindZilla' exists in the global namespace.
  // If not, assign window.FindZilla an object literal.
})(window.FindZilla = window.FindZilla || {});

var storageManager = new FindZilla.StorageManager();
var optionsManager = new FindZilla.OptionsManager(storageManager);
var background = new FindZilla.BackgroundManager(storageManager);

optionsManager.init();

background.init();
