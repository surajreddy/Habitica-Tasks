/**
 * Welcome to Habitica Tasks
 *
 *
 */

var UI = require('ui');
var Settings = require('settings');
var ajax = require('ajax');
var Feature = require('platform/feature');
var Vibe = require('ui/vibe');

// habitica API constants
var habiticaBaseUrl = 'https://habitica.com/api/v3';
var habiticaStatus = '/status'; //Returns the status of the server (up or down). Does not require authentication.
var habiticaGetTasksUser = '/tasks/user';
//var habiticaGetUserAnonymized = '/user/anonymized';
var habiticaGetUser = '/user';
var habiticaPostTasksScore = '/tasks/:taskId/score/:direction';
var habiticaPostTasksChecklistScore = '/tasks/:taskId/checklist/:itemId/score';

Settings.option('userId','555cfb2d-b52b-4a00-b0a8-1c66d74a5de9');
Settings.option('apiToken','d1770bca-5ba4-4bc8-b42e-ebefb0114241');

// Set a configurable
Settings.config(
  { url: 'https://kdemerath.github.io/settings.html' },
  function(e) {
    console.log('opening configurable');
  },
  function(e) {
    console.log('closed configurable');
    // Show the raw response if parsing failed
    if (e.failed) {
      console.log(e.response);
    } else {
      var options = Settings.option();
      console.log(JSON.stringify(options));
      Settings.data(options);
      Settings.option('userId','555cfb2d-b52b-4a00-b0a8-1c66d74a5de9');
      Settings.option('apiToken','d1770bca-5ba4-4bc8-b42e-ebefb0114241');
    }
  }
);

// check habitica status
if (!checkHabiticaStatus) {
  var cardNoServer = new UI.Card({
    title: 'Server unavaiable',
    body: 'habitica Server is not available. Please restart.',
    scrollable: true
  });
  cardNoServer.show();
} else if(!Settings.option('userId') || !Settings.option('apiToken') || Settings.option('userId') === '' || Settings.option('apiToken') === '') {
  var cardSettingsIncomplete = new UI.Card({
    title: 'Settings incomplete',
    body: 'Please enter your credentials in the settings.',
    scrollable: true
  });
  cardSettingsIncomplete.show();
} else {
  
  // get all tasks
  var allTasks = [];
  getUserTasks();
  
  // get user object
  var user = {};
  getUserObject();
  
  // start menu
  var mainMenu = new UI.Menu({
    highlightBackgroundColor: Feature.color('indigo', 'black'),
    sections: [{
      title: 'Tasks',
      items: [{
        title: 'Habits' 
      }, {
        title: 'Dailies'
      }, {
        title: 'To-Dos'
      }]
    }, {
      title: 'User',
      items: [{
        title: 'Stats'
      }]
    }]
  });
  
  mainMenu.on('select', function(e) {
    console.log('Selected section ' + e.sectionIndex + ' "' + e.section.title + '" item ' + e.itemIndex + ' "' + e.item.title + '"');
    if (!allTasks) {
      console.log('No tasks available');
      var cardNoTasks = new UI.Card({
        title: 'No tasks',
        body: 'Please retry.'
      });
      cardNoTasks.show();
    } else {
      console.log('Tasks available');
      switch (e.sectionIndex) {
        case 0: { // tasks
          // create tasks menu
          var menuAllTasks = new UI.Menu({
            highlightBackgroundColor: Feature.color('indigo', 'black')
          });
          switch (e.itemIndex) {
            case 0: { // habits
              menuAllTasks = createTasksMenu('habit');
              break;
            }
            case 1: { // dailies
              menuAllTasks = createTasksMenu('daily');
              break;
            }
            case 2: { // to-dos
              menuAllTasks = createTasksMenu('todo');
              break;
            }
          }
          menuAllTasks.show();
          break;
        }
        case 1: { // user
          switch (e.itemIndex) {
            case 0: { // stats
              if (!user) {
                console.log('No user data available');
                var cardNoUser = new UI.Card({
                  title: 'No user data',
                  body: 'No user data available. Please retry.'
                });
                cardNoUser.show();
              } else {
                /*console.log('User data available');
                console.log('Health: ' + Math.round(user.stats.hp));
                console.log('MaxHealth' + user.stats.maxHealth);
                console.log('Gold: ' + Math.floor(user.stats.gp));
                console.log('Level: ' + user.stats.lvl);
                console.log('Experience: ' + user.stats.exp);
                console.log('toNextLevel' + user.stats.toNextLevel);
                console.log('Mana: ' + Math.floor(user.stats.mp));
                console.log('maxMP' + user.stats.maxMP);*/
                var cardUserStats = new UI.Card({
                  title: 'User Stats',
                  body: 'Health: ' + Math.round(user.stats.hp) + '/' + user.stats.maxHealth + '\n' + 'Experience: ' + user.stats.exp + '/' + user.stats.toNextLevel + ((user.stats.lvl >= 10) ? '\n' + 'Mana: ' + Math.floor(user.stats.mp) + '/' + user.stats.maxMP : '') + '\n' + 'Gold: ' + Math.floor(user.stats.gp) + '\n' + 'Level: ' + user.stats.lvl,
                  scrollable: true
                });
                cardUserStats.show();
              }
              break;
            }
          }
          break;
        }
      }
    }
  });
  mainMenu.show();
  
}

function checkHabiticaStatus() {
  var serverIsUp = false;
  ajax(
    {
      url: habiticaBaseUrl + habiticaStatus,
      type: 'json',
      async: 'false'
    },
    function(data, status, request) {
      if (data.success){
        console.log('Habitica Server Status: ' + data.data.status);
        if (data.data.status == 'up') {serverIsUp = true;}
      } else {
        console.log(data.error + ' - ' + data.message);
      }
    },
    function(error, status, request) {
      console.log('The ajax request failed: ' + error);
    }
  );
  return serverIsUp;
}

function createTasksMenu(section) {
  // initialize menu
  var menu = new UI.Menu({
    highlightBackgroundColor: Feature.color('indigo', 'black')
  });
  // initialize sections
  var sectionHabits = {
    title: 'Habits',
    items: []
  };
  var sectionDailies = {
    title: 'Dailies',
    items: []
  };
  var sectionToDos = {
    title: 'To-Dos',
    items: []
  };
  
  // get tasks from allTasks and put into sectionsXY
  if(!allTasks){
    console.log('allTasks is undefined');
  } else {
    
    // get copy of allTasks
    var allTasksPrep = allTasks.slice();
    
    // get only 'section' tasks
    if (!section) {
      console.log('Section not defined. Get all kind of tasks.');
      allTasksPrep = enrichTaskItemsByMenuFields(allTasksPrep);
      
      // put appropriate tasks into sections
      sectionHabits.items = allTasksPrep.filter(
        function(x){
          return x.type == 'habit';
        }
      ).slice();
      sectionDailies.items = allTasksPrep.filter(
        function(x){
          return x.type == 'daily' && !x.completed;
        }
      ).slice();
      sectionToDos.items = allTasksPrep.filter(
        function(x){
          return x.type == 'todo' && !x.completed;
        }
      ).slice();
      
      // put sections into menu
      menu.section(0, sectionHabits);
      menu.section(1, sectionDailies);
      menu.section(2, sectionToDos);
    } else {
      console.log('Section is "' + section + '". Get only these kind of tasks.');
      switch (section) {
        case 'habit': {
          sectionHabits.items = allTasksPrep.filter(
            function(x){
              return x.type == 'habit';
            }
          ).slice();
          sectionHabits.items = enrichTaskItemsByMenuFields(sectionHabits.items);
          menu.section(0, sectionHabits);
          break;
        }
        case 'daily': {
          sectionDailies.items = allTasksPrep.filter(
            function(x){
              var today = new Date();
              var startDate = new Date(x.startDate);
              console.log('heute ist ' + today + '. Start Datum war ' + startDate + '. Differenz ist ' + (today - startDate) + '. Das sind ' + Math.floor((today - startDate)/(1000*60*60*24)) + ' Tage.');
              return x.type == 'daily' && !x.completed  && ((x.frequency == 'weekly' && x.repeat[habiticaWeekday()]) || (x.frequency == 'daily' & startDate < today && (Math.floor((today - startDate)/(1000*60*60*24)) % x.everyX === 0)));
            }
          ).slice();
          sectionDailies.items = enrichTaskItemsByMenuFields(sectionDailies.items);
          menu.section(0, sectionDailies);
          break;
        }
        case 'todo': {
          sectionToDos.items = allTasksPrep.filter(
            function(x){
              return x.type == 'todo'; // should nout be necessary any more && !x.completed;
            }
          ).slice();
          sectionToDos.items = enrichTaskItemsByMenuFields(sectionToDos.items);
          menu.section(0, sectionToDos);
          break;
        }
      }
    }
  }
  
  menu.on('select', function(e) {
    console.log('Selected item #' + e.itemIndex + ' of section #' + e.sectionIndex);
    console.log('The item is titled "' + e.item.title + '"');
    if (e.item.down === true) {
      console.log('The selected task has .down-item.');
      if (e.item.up === false) {
        console.log('The selected task has no .up-item.');
        scoreTaskDown(e.item);
      } else {
        var selectedTask = e;
        var cardUpDown = new UI.Card(
          {
            'title': e.item.type,
            'body': e.item.title
          }
        );
        cardUpDown.action({
          up: 'images/action_icon_plus.png',
          down: 'images/action_icon_minus.png'
        });
        cardUpDown.on('click', 'up', function(e) {
          console.log('cardUpDown click up');
          scoreTaskUp(selectedTask.item);
          cardUpDown.hide();
        });
        cardUpDown.on('click', 'down', function(e) {
          console.log('cardUpDown click down');
          scoreTaskDown(selectedTask.item);
          cardUpDown.hide();
        });
        cardUpDown.show();
      }
    } else {
      console.log('The selected task has no .down-item.');
      console.log('Selected item is:' + JSON.stringify(e.item));
      if (typeof e.item.checklist !== 'undefined' && e.item.checklist.length > 0) {
        // access checklist
        var checklistMenu = new UI.Menu({
          highlightBackgroundColor: Feature.color('indigo', 'black')
        });
        // initialize sections
        var sectionChecklist = {
        title: 'Checklist',
        items: []
        };
        sectionChecklist.items = e.item.checklist.slice();
        sectionChecklist.items = enrichChecklistItemsByMenuFields(sectionChecklist.items, e.item.id);
        checklistMenu.section(0, sectionChecklist);
        console.log(JSON.stringify(sectionChecklist)); // remove
        checklistMenu.on('select', function(e) {
          scoreChecklistItem(e.item);
        });
        checklistMenu.show();
        // scoreTaskUp(e.item); //remove when ready
      } else {
        // no checklist available -> just score the task
        scoreTaskUp(e.item); 
      }
    }
  });
  return menu;
}

function scoreChecklistItem(checklistItem) {
  if (checklistItem) {
    if (checklistItem.id) {
      ajax(
        {
          url: habiticaBaseUrl + habiticaPostTasksChecklistScore.replace(':taskId', checklistItem.taskId).replace(':itemId', checklistItem.id),
          method: 'post',
          type: 'json',
          headers: {
            'x-api-user': Settings.option('userId'),
            'x-api-key': Settings.option('apiToken')
          }
        },
        function(data, status, request) {
          if (data.success){
            console.log('User tasks: ' + JSON.stringify(data));
            
          } else {
            console.log(data.error + ' - ' + data.message);
          }
        },
        function(error, status, request) {
          console.log('The ajax request failed: ' + error);
        }
      );
    } else {
      console.log('Checklist item id not available.');
    }
  } else {
    console.log('Checklist item not available.');
  }
}

function enrichChecklistItemsByMenuFields(checklistArray, taskId) {
  // enrich tasks by menu relevant fields
  checklistArray = checklistArray.filter(
    function(x) {
      return !x.completed;
    }
  );
  checklistArray = checklistArray.map(
    function(x) {
      x.title = x.text;
      x.taskId = taskId;
      if (x.text.length > 20) {
        x.subtitle = '...' + x.text.substring(15);
      } else {
        x.subtitle = x.text;
      }
      return x;
    }
  );
  return checklistArray;
}

function getUserTasks() {
  ajax(
    {
      url: habiticaBaseUrl + habiticaGetTasksUser,
      type: 'json',
      headers: {
        'x-api-user': Settings.option('userId'),
        'x-api-key': Settings.option('apiToken')
      }
    },
    function(data, status, request) {
      if (data.success){
        console.log('User tasks: ' + JSON.stringify(data));
        allTasks = data.data;
      } else {
        console.log(data.error + ' - ' + data.message);
      }
    },
    function(error, status, request) {
      console.log('The ajax request failed: ' + error);
    }
  );
}

function scoreTaskUp(task) {
  if (task) {
    if (task.id) {
      ajax(
        {
          url: habiticaBaseUrl + habiticaPostTasksScore.replace(':taskId', task.id).replace(':direction', 'up'),
          method: 'post',
          type: 'json',
          headers: {
            'x-api-user': Settings.option('userId'),
            'x-api-key': Settings.option('apiToken')
          }
        },
        function(data, status, request) {
          if (data.success){
            console.log('User tasks: ' + JSON.stringify(data));
            // update users stats
            user.stats.hp = data.data.hp;
            user.stats.mp = data.data.mp;
            user.stats.exp = data.data.exp;
            user.stats.gp = data.data.gp;
            user.stats.lvl = data.data.lvl;
            
            goodVibe(); // Reward the user for doing well :)
          } else {
            console.log(data.error + ' - ' + data.message);
          }
        },
        function(error, status, request) {
          console.log('The ajax request failed: ' + error);
        }
      );
    } else {
      console.log('Task id not available.');
    }
  } else {
    console.log('Task not available.');
  }
}

function scoreTaskDown(task) {
  if (task) {
    if (task.id) {
      ajax(
        {
          url: habiticaBaseUrl + habiticaPostTasksScore.replace(':taskId', task.id).replace(':direction', 'down'),
          method: 'post',
          type: 'json',
          headers: {
            'x-api-user': Settings.option('userId'),
            'x-api-key': Settings.option('apiToken')
          }
        },
        function(data, status, request) {
          if (data.success){
            console.log('User tasks: ' + JSON.stringify(data));
            // update users stats
            user.stats.hp = data.data.hp;
            user.stats.mp = data.data.mp;
            user.stats.exp = data.data.exp;
            user.stats.gp = data.data.gp;
            user.stats.lvl = data.data.lvl;
            
            badVibe(); // Scold the user for doing bad.
          } else {
            console.log(data.error + ' - ' + data.message);
          }
        },
        function(error, status, request) {
          console.log('The ajax request failed: ' + error);
        }
      );
    } else {
      console.log('Task id not available.');
    }
  } else {
    console.log('Task not available.');
  }
}

function getUserObject() {
  ajax(
    {
      url: habiticaBaseUrl + habiticaGetUser,
      type: 'json',
      headers: {
        'x-api-user': Settings.option('userId'),
        'x-api-key': Settings.option('apiToken')
      }
    },
    function(data, status, request) {
      if (data.success){
        console.log('User object: ' + JSON.stringify(data));
        user = data.data;
      } else {
        console.log(data.error + ' - ' + data.message);
      }
    },
    function(error, status, request) {
      console.log('The ajax request failed: ' + error);
    }
  );
}

function enrichTaskItemsByMenuFields(tasksArray) {
  // enrich tasks by menu relevant fields
  tasksArray = tasksArray.map(
    function(x) {
      var strChecklist = '';
      if (typeof x.checklist !== 'undefined' && x.checklist.length > 0) {
        var checkedItems = x.checklist.filter(function(value) {
          return value.completed;
        }).length;
        strChecklist = checkedItems + '/' + x.checklist.length;
      }
      x.title = x.text;
      if (x.text.length > 14) {
        if (x.text.length > 20) {
          if (strChecklist === '') {
            x.subtitle = '...' + x.text.substring(15);
          } else {
            x.subtitle = '...' + x.text.substring(15, 30) + ' ' + strChecklist;
          }
        } else {
          x.subtitle = x.text + ' ' + strChecklist;
        }
      } else {
        x.subtitle = x.text + ' ' + strChecklist;
      }
      return x;
    }
  );
  return tasksArray;
}

function habiticaWeekday(date) {
  var weekday = new Array(7);
  weekday[0] = "su";
  weekday[1] = "m";
  weekday[2] = "t";
  weekday[3] = "w";
  weekday[4] = "th";
  weekday[5] = "f";
  weekday[6] = "s";
  
  if (!date) {
    var today = new Date();
    return weekday[today.getDay()];
  } else {
    return weekday[date.getDay()];
  }
}

function goodVibe() {
  Vibe.vibrate('double');
}

function badVibe() {
  Vibe.vibrate('long');
}