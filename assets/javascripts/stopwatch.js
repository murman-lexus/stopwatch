window.initStopwatch = function(config){
  var currentTimerUrl = config.currentTimerUrl;
  var hourFormat = config.hourFormat;
  var locales = config.locales;

  var hoursRe = hourFormat.replace(/0+/g, '\\d+').replace(/\./g, '\\.');
  var titleRegexp = new RegExp('^(' + hoursRe + ' - )?(.*)$');
  var menuItemRegexp = new RegExp('^(.*?)( \\(' + hoursRe + '\\))?$')

  var highlightTimer = function(id, timeHtml){
    $('table.time-entries tr.time-entry.running').removeClass('running');
    if(id && id != ''){
      $('table.time-entries tr.time-entry').each(function(idx, el){
        var tr = $(el);
        var trId = tr.attr('id');
        if (trId && trId == 'time-entry-'+id) {
          tr.addClass('running');
          if (timeHtml) {
            tr.find('td.hours').html(timeHtml)
          }
        }
      });
    }
  };

  var updateSpentTime = function(entryId, spentTime){
    // update window title
    var s = ''
    if (spentTime){
      s = spentTime + ' - ';
    }
    var match = titleRegexp.exec(document.title);
    document.title = s + match[2];

    // update menu item
    var menuItems = $('a[id="stopwatch-menu"]');
    if (spentTime){
      s = ' (' + spentTime + ')';
    } else {
      s = '';
    }
    menuItems.each(function() {
      var item = $(this);
      var label = item.data('stopwatchBaseLabel');
      if (!label) {
        var original = menuItemRegexp.exec(item.text());
        label = original ? original[1] : item.text();
        item.data('stopwatchBaseLabel', label);
      }
      item.text(label);
    });
  };

  var updateActiveLink = function(data) {
    if (!data || !data.running || !data.issue_id) {
      $('.stopwatch-active-menu-item').remove();
      return;
    }
    var menu = $('#top-menu');
    if (!menu.length) return;
    var existing = menu.children('.stopwatch-active-menu-item');
    if (existing.length) {
      existing.find('.stopwatch-active-trigger').text('⏱ ' + data.session_time_spent);
      existing.find('.stopwatch-active-issue')
        .attr('href', config.issueUrl.replace('/0', '/' + data.issue_id))
        .text('#' + data.issue_id + (data.issue_subject ? ': ' + data.issue_subject : '') + ' · ' + data.session_time_spent);
      existing.find('.stopwatch-active-stop').attr('href', config.stopUrl.replace('/0/', '/' + data.time_entry_id + '/') + '?context=1');
      return;
    }
    var wrapper = $('<div>', {class: 'stopwatch-active-menu-item'});
    var trigger = $('<button>', {
      type: 'button', class: 'stopwatch-active-trigger',
      'aria-label': locales.activeIssue, 'aria-expanded': 'false',
      title: locales.activeIssue
    }).text('⏱ ' + data.session_time_spent);
    var panel = $('<div>', {class: 'stopwatch-active-panel'});
    var issue = $('<a>', {
      href: config.issueUrl.replace('/0', '/' + data.issue_id),
      class: 'stopwatch-active-issue', title: locales.openIssue
    }).text('#' + data.issue_id + (data.issue_subject ? ': ' + data.issue_subject : '') + ' · ' + data.session_time_spent);
    var stop = $('<a>', {
      href: config.stopUrl.replace('/0/', '/' + data.time_entry_id + '/') + '?context=1',
      class: 'stopwatch-active-stop', 'data-remote': 'true', 'data-method': 'put', title: locales.stopTimer
    }).text('■ ' + locales.stopTimer);
    panel.append(issue, stop);
    wrapper.append(trigger, panel);
    trigger.on('click', function() {
      var open = wrapper.toggleClass('is-open').hasClass('is-open');
      trigger.attr('aria-expanded', String(open));
    });
    wrapper.on('keydown', function(event) {
      if (event.key === 'Escape') {
        wrapper.removeClass('is-open');
        trigger.attr('aria-expanded', 'false').trigger('focus');
      }
    });
    menu.append(wrapper);
  };

  var highlightRunningTimer = function(data){
    if (data && data.running && data.time_entry_id) {
      highlightTimer(data.time_entry_id, data.html_time_spent);
      updateSpentTime(data.time_entry_id, data.time_spent);
      updateActiveLink(data);
      window.setTimeout(function(){
        fetchCurrentTimer(highlightRunningTimer);
      }, 60000);
    } else {
      highlightTimer();
      updateSpentTime();
      updateActiveLink();
    }
  };

  var fetchCurrentTimer = function(successHandler){
    $.ajax(currentTimerUrl, {
      type: 'GET',
      contentType: 'application/octet-stream', // suppress the ajax-indicator that's bound to ajax events in application.js
      success: successHandler
    });
  };

  //$(document).on('ready', fetchCurrentTimer(highlightRunningTimer));

  return({
    highlightRunningTimer: highlightRunningTimer,
    timerStopped: function(){
      highlightRunningTimer();
      // fix up any issue timer start/stop links in the UI
      // no running timer -> all links will start a timer
      $('a.stopwatch_issue_timer').each(function(){
        var a = $(this);
        a.attr('href', a.attr('href').replace(/stop$/, 'start'));
        a.find('span').text(locales.startTimer);
      });
    },
    timerStarted: function(data){
      highlightRunningTimer(data);
     // {
     //   running: true,
     //   time_entry_id: entryId,
     //   time_spent: spentTime
     // });
      // fix up any issue timer start/stop links in the UI
      // all links will start a timer, except the one for the current issue,
      // which has to be turned into a stop link.
      if(data.running) {
        $('a.stopwatch_issue_timer').each(function(){
          var a = $(this);
          var href = a.attr('href');
          if(data.issue_id) {
            if(a.data('issueId') == data.issue_id) {
              a.attr('href', href.replace(/start$/, 'stop'));
              a.find('span').text(locales.stopTimer);
            } else {
              a.attr('href', href.replace(/stop$/, 'start'));
              a.find('span').text(locales.startTimer);
            }
          }
        });
      }
    },
    updateStartStopLink: function(id, replacement){
      $(id).replaceWith(function(){
        return $(replacement, { html: $(this).html() });
      });
    },
    setProjectId: function(projectId){
      var a = $('a#stopwatch-menu');
      a.attr('href', a.attr('href').replace(/\/new.*$/, '/new?project_id='+projectId));
    }
  });
};

