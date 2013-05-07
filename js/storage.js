/*
 *  Copyright (c) 2013 Michael Souza <contact@michael-souza.com>
 *  This source code is released under the MIT license. (http://opensource.org/licenses/MIT)
 */

(function(FindZilla, undefined) {

  /*
   * Public Constructors
   */
  FindZilla.StorageManager = function() {
    /*
     * Public Methods
     */
    function saveData(key, data, callback) {
      items = {};

      items[key] = data;

      // Store the saved data for the closed tab
      chrome.storage.local.set(items, function() {
        if (callback) {
          callback();
        }
      });
    }

    function loadData(key, callback, altCallback) {
      chrome.storage.local.get(key, function(items) {
        var data = items[key];

        if (data) {
          if (callback) {
            callback(data);
          }
        } else {
          if (altCallback) {
            altCallback();
          }
        }
      });
    }

    function clearData() {
      // Clear local storage
      chrome.storage.local.clear();
    }

    function removeData(key, callback) {
      chrome.storage.local.remove(key, function() {
        if (callback) {
          callback();
        }
      });
    }

    return {
      clearData : clearData,
      saveData : saveData,
      loadData : loadData,
      removeData : removeData
    };
  };

  // Check whether 'FindZilla' exists in the global namespace.
  // If not, assign window.FindZilla an object literal.
})(window.FindZilla = window.FindZilla || {});
