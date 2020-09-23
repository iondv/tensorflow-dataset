/* eslint-disable */
'use strict';

(function () {

  var DEFAULT_DT_DOM = "<'row'<'col-xs-6 dt-filter-col'f><'col-xs-6'l>r>t<'row'<'col-xs-6'i><'col-xs-6'p>>";
  var DOWN_DT_DOM = "t<'row'<'col-md-12 text-right'ipl>>";

  window.ListManager = function ListManager($table) {
    this.currentData = {};
    this.inserted = {};
    this.insertedRows = [];
    this.removed = {};
    this.deleted = {};
    this.requestParams = '';
    this.options = $table.data('options');
    if (!this.options) {
      return;
    }
    this.options.multiSelect = this.options.inlineForm ? false : this.options.multiSelect;
    //this.options.dt.searching = true;
    this.$table = $table;

    this.$container = $table.closest('.list-container');
    this.$controls = this.$container.find('.list-tools');
    this.$loading = this.$container.find('.table-loading');
    this.viewFilters = this.$container.find('.list-view-filters .list-view-filter');
    $table.data('manager', this);

    this.updateAutoOpen(function () {
      this.init();
      this.setSelectable();
      var self = this;
      this.$controls.find('.btn').click(function () {
        messageCallout.hide();
      });
      this.$controls.find('.select').click(function () {
        self.select();
      });
      this.$controls.find('.add').click(function () {
        self.add();
      });
      this.$controls.find('.reload').click(function () {
        self.reload(true);
      });
      this.$controls.find('.create').click(function () {
        self.create();
      });
      this.$controls.find('.recalculate_processing_model').click(function () {
        console.log('redefined recalculate func test');
        self.recalculateModel();
      })
      this.$controls.find('.edit').click(function () {
        self.update();
      });
      this.$controls.find('.remove').click(function () {
        self.remove();
      });
      this.$controls.find('.delete').click(function () {
        self.del();
      });

      function checkExportStatus (elem, format) {
        var loader = elem.children('.loader');
        var download = elem.children('.download');
        loader.show();
        download.hide();
        $.ajax({
          url: self.options.url.export + '/' + format + '/status',
          type: 'GET',
          success: function (data, textStatus, jqXHR) {
            if (data.status === 'ready') {
              loader.hide();
              if (data.previous) {
                download.attr('title', moment(data.previous).format(DATETIME_FORMAT));
                download.show();
              }
            } else {
              setTimeout(checkExportStatus, 5000, elem, format);
            }
          },
          error: function (jqXHR, textStatus, errorThrown) {
            console.log(textStatus, errorThrown);
            loader.hide();
            download.hide();
          }
        });
      }

      this.$container.find('.export').each(function (i, e) {
        var el = $(e);
        var isBackground = el.data('isBackground');
        var hasParams = el.data('hasParams');
        var format = el.data('format');
        el.on('click', function (e) {
          e.stopPropagation();
          e.preventDefault();
          if (e.target === this) {
            self.export(format, hasParams, isBackground, function (err, data) {
              if (!err) {
                checkExportStatus(el, format);
              }
            });
          } else {
            window.open(self.options.url.export + '/' + format + '/download');
          }
        });
        if (isBackground) {
          checkExportStatus(el, format);
        }
      });
      this.$controls.find('.sorting').click(function () {
        self.reorder($(this).hasClass('sorting-up'));
      });
      this.$table.on('error.dt', this.errorDataTable.bind(this));
    }.bind(this));
  }

  ListManager.init = function () {
    $('.list-manager').each(function () {
      new ListManager($(this));
    });
  };

  function treeToList(tree, list, level) {
    if (Array.isArray(tree)) {
      for (var i = 0; i < tree.length; i++) {
        tree[i].__level = level;
        list.push(tree[i]);
      }
    } else if (typeof tree === 'object') {
      for (var nm in tree) {
        if (tree.hasOwnProperty(nm)) {
          list.push({__group: nm, __level: level || 0});
          treeToList(tree[nm], level + 1);
        }
      }
    }
  }

  ListManager.prototype = {
    constructor: ListManager,

    init: function () {
      try {

        this.$table.on('preXhr.dt', function (e, settings, data) {
          this.onPreLoad(e, settings, data);
        }.bind(this));

        this.$table.on('xhr.dt', function (e, settings, json, xhr) {
          this.onLoad(e, settings, json, xhr);
        }.bind(this));

        this.setDtRenders();
        this.prepareDtOptions({});
        this.dt = this.$table.DataTable(this.getDtOptions());
        this.commandManager = new ListCommandManager(this.options.commands, this.$controls.find('.command'), this.$table);
        this.filter = new ListFilter(this);

        this.$table.on('draw.dt', function () {
          this.$table.find('.checkbox').iCheck({
            checkboxClass: 'icheckbox_flat',
            radioClass: 'iradio_flat',
            indeterminateClass: 'indeterminate-checkbox'
          });
          customizeDatatable(this);
        }.bind(this));

        this.initSearching();
        customizeDatatable(this);
        this.inlineForm = this.options.inlineForm ? new InlineForm(this) : null;

        var me = this;
        this.$table.on('click', '.hashtag', null, function () {
          if ($(this).hasClass('filtered')) {
            for (var i = me.options.filter.length - 1; i >= 0; i--) {
              var f = me.options.filter[i];
              if (f.property === $(this).data('property')
                && f.operation === 10
                && f.nestedConditions.length === 1
                && f.nestedConditions[0].property === $(this).data('items-class-key-property')
                && f.nestedConditions[0].operation === 9) {
                var j = f.nestedConditions[0].value.indexOf($(this).data('key'));
                if (j >= 0) {
                  f.nestedConditions[0].value.splice(j, 1);
                }
                if (f.nestedConditions[0].value.length === 0) {
                  me.options.filter.splice(i, 1);
                }
              }
            }
          } else {
            var condition;
            for (var i = 0; i < me.options.filter.length; i++) {
              var f = me.options.filter[i];
              if (f.property === $(this).data('property')
                && f.operation === 10
                && f.nestedConditions.length === 1
                && f.nestedConditions[0].property === $(this).data('items-class-key-property')
                && f.nestedConditions[0].operation === 9) {
                f.nestedConditions[0].value = [];
                condition = f;
                break;
              }
            }
            if (!condition) {
              condition = {
                property: $(this).data('property'),
                operation: 10,
                nestedConditions: [{
                  property: $(this).data('items-class-key-property'),
                  operation: 9,
                  value: []
                }]
              };
              me.options.filter.push(condition);
            }
            if (condition.nestedConditions[0].value.indexOf($(this).data('key')) < 0) {
              condition.nestedConditions[0].value.push($(this).data('key'));
            }
          }
          me.reload();
        });
        this.initHiddenLinks();
        $(window).scroll(function (event) {
          this.trackLoader(event);
        }.bind(this));

        var _this = this;
        this.viewFilters.each(function(i, e) {
          var filter = $(e);
          if (filter.attr('type') === 'datetime') {
            filter.datetimepicker({
              locale: _this.options.locale.lang,
              format: _this.options.locale.dateFormat,
              useCurrent: false
            }).on('dp.change', function (e) {
              _this.reload(true);
            });
          } else {
            if (filter.is('select')) {
              var options = {
                width: '100%',
                placeholder: filter.attr('placeholder'),
                allowClear: true
              };
              if (filter.data('url')) {
                var length = filter.data('length') || 20;
                options.ajax = {
                  type: 'POST',
                  dataType: 'json',
                  url: filter.data('url'),
                  delay: 250,
                  data: function (params) {
                    return {
                      search: {value: params.term},
                      start: ((params.page || 1) - 1) * length,
                      length: length
                    };
                  },
                  processResults: function (data, params) {
                    var res = [];
                    for(var i = 0; i < data.data.length; i++){
                      res.push({id: data.data[i]._id, text: data.data[i].__string, object: data.data[i]});
                    }
                    params.page = params.page || 1;
                    return {
                      results: res,
                      pagination: {
                        more: (params.page * length) < data.recordsTotal
                      }
                    };
                  }
                };
              }
              filter.select2(options);
            }
            filter.on('change', function (e) {
              _this.reload(true);
            });
          }
        });

      } catch (err) {
        messageCallout.error(__('js.listManager.initError'));
        console.error(err);
      }
    },

    initHiddenLinks: function () {
      this.$table.on('click', '.hidden-link', function (event) {
        if (!event.ctrlKey) {
          event.preventDefault();
        }
      });
    },

    initSearching: function () {
      if (this.options.dt.searching) {
        var timer = null;
        var $input = this.$container.find('.dataTables_filter input');
        var prevValue = $input.val();
        $input.off().on('keyup', function (ev) {
          clearTimeout(timer);
          var value = $input.val();
          if (ev.keyCode === 13) {
            prevValue = value;
            if (value.length >= this.options.dt.searchMinLength) {
              this.dt.search(value).draw();
            } else {
              this.dt.search('').draw();
            }
          } else if (this.options.dt.searchDelay > 0 && prevValue !== value) {
            timer = setTimeout(function () {
              prevValue = value;
              if (value.length >= this.options.dt.searchMinLength) {
                this.dt.search(value).draw();
              } else {
                this.dt.search('').draw();
              }
            }.bind(this), this.options.dt.searchDelay);
          }
        }.bind(this));
      }
    },

    trackLoader: function () {
     if (this.$loading.is(':visible')) {
        var overlayPos = this.$loading.offset();
        var overlayHeight = this.$loading.height();
        var windowHeight = $(window).height();
        var top = overlayPos.top - $(window).scrollTop();
        var bottom = top + overlayHeight;
        if (bottom > windowHeight) {
          bottom = windowHeight;
        }
        this.$loading.children().css('top', ((bottom - (top < 0 ? 0 : top)) / 2 + (top < 0 ? -top : 0)) +'px');
      }
    },

    isGlobalReadonly: function () {
      return this.objectManager && this.objectManager.options.globalReadonly;
    },

    export: function (format, params, isBackground, startBackgroundCallback) {
      var url = this.options.url.export + '/' + format;
      if (params) {
        imodal.setParams('exportStarted', false);
        imodal.setParams('isBackground', isBackground);
        imodal.post(url + '/params', {filter: JSON.stringify(this.currentData.filter)}, function (w) {
          imodal.on('beforeClose', function () {
            if (imodal.getParams('exportStarted')) {
              startBackgroundCallback(null, {});
            }
          });
        });
      } else if (isBackground) {
        $.ajax({
          url: url,
          type: "POST",
          data: {filter: JSON.stringify(this.currentData.filter)},
          success: function (data, textStatus, jqXHR) {
            startBackgroundCallback(null, data);
          },
          error: function (jqXHR, textStatus, errorThrown) {
            startBackgroundCallback(errorThrown);
            console.log(textStatus, errorThrown);
          }
        });
      } else {
        var dwnloader = $(
          '<iframe id="export_downloader" style="display:none;"></iframe><form id="export_post_form" style="display: none;" method="post" target="export_downloader" action="' +
          url + '"><input type="text" name="filter" value="' +
          JSON.stringify(this.currentData.filter) + '" /></form>'
        );
        $(document.body).append(dwnloader);
        $(dwnloader.get(0)).load(function () {
          dwnloader.remove();
        });
        dwnloader.get(1).submit();
      }
    },

    prepareDtOptions: function () {
      this.options.dt = $.extend({
        searchMinLength: 1
      }, this.options.dt);
      for (var i = 0; i < this.options.dt.columns.length; ++i) {
        var item = this.options.dt.columns[i];
        if (item.hint) {
          item.title = '<span title="' + item.hint + '">' + item.title + '<i class="help-sign glyphicon"></i>';
        }
        item.title = '<div class="dt-head-cell" data-name="'+ item.name +'">'+ item.title +'</div>';
      }
    },

    getDtOptions: function (defaults) {
      if (this.options.url && this.options.url.list) {
        var me = this;
        return $.extend({
          serverSide: true,
          processing: false,
          searchDelay: 1000,
          sDom: DOWN_DT_DOM,
          ajax: {
            url: this.options.url.list,
            type: 'POST',
            contentType: 'application/json',
            data: function (data) {
              var i, attr;
              if (me.options.dt.node) {
                data.node = me.options.dt.node;
              }
              if (me.options.dt.dsorting) {
                data.sorting = me.options.dt.dsorting;
              }
              if (me.options.options && me.options.options.styles) {
                data.styles = me.options.options.styles;
              }
              data.filter = me.options.filter ? me.options.filter.slice(0) : [];
              if (me.filter) {
                var userFilters = me.filter.getUserFilters();
                if (userFilters) {
                  data.query = userFilters;
                }
              }
              if (me.viewFilters.length) {
                var filters = [];
                me.viewFilters.each(function (i, el) {
                  var filter = $(el);
                  var p = filter.attr('name');
                  var v = filter.val();
                  if (v) {
                    var f = {};
                    if (filter.attr('type') === 'datetime') {
                      var m = moment(v, me.options.locale.dateFormat);
                      if (filter.data('operation') === 'lt' || filter.data('operation') === 'lte') {
                        m.add({hours:23, minutes:59, seconds: 59, milliseconds: 999});
                      }
                      if (filter.data('mode') === 2) {
                        m.utc();
                      }
                      v = m.format();
                    }
                    f[filter.data('operation')] = ['$' + p, v];
                    filters.push(f);
                  }
                });
                if (filters.length) {
                  data.viewFilters = filters.length > 1 ? {and: filters} : filters[0];
                }
              }
              data.eagerLoading = me.options.dt.eagerLoading || [];
              var searchAttrs = [];
              var types = me.getClassNames();
              var needed = null;
              for (i = 0; i < me.options.dt.columns.length; ++i) {
                var col = me.options.dt.columns[i];
                if (!col.data) {
                  continue;
                }
                attr = col.data.replace(/_str$/, '');
                if (!needed) {
                  needed = {};
                }
                needed[attr] = true;
                switch (col.className) {
                  case types.TEXT:
                  case types.REFERENCE:
                  case types.COLLECTION: {
                    if (data.eagerLoading.indexOf(attr) === -1) {
                      data.eagerLoading.push(attr);
                    }
                    break;
                  }
                }
                searchAttrs.push(attr);
              }
              data.searchOptions = me.options.dt.searchOptions || {};
              data.searchOptions.searchBy = data.searchOptions.searchBy || searchAttrs;
              if (needed) {
                data.needed = needed;
              }
              this.currentData = data;
              return JSON.stringify(data);
            }.bind(this)
          },
          rowCallback: function (row, data) {
            var r = $(row);
            if (me.inserted.hasOwnProperty(data._id)) {
              r.addClass('inserted');
            }
            if (me.deleted.hasOwnProperty(data._id)) {
              r.addClass('deleted');
            }
            if (me.removed.hasOwnProperty(data._id)) {
              r.addClass('removed');
            }
            if (data.__styles) {
              for (var nm in data.__styles) {
                if (data.__styles.hasOwnProperty(nm)) {
                  if (nm[0] === '@') {
                    r.css(nm.substr(1), data.__styles[nm]);
                  } else {
                    if (data.__styles[nm]) {
                      r.addClass(nm);
                    } else {
                      r.removeClass(nm);
                    }
                  }
                }
              }
            }
          }
        }, defaults, this.options.dt);
      }

      if (this.options.dt.data) {
        this.options.dt.data = this.deleteEmptyRows(this.options.dt.data);
      }

      return $.extend({
        data: [],
        sDom: DEFAULT_DT_DOM,
        rowCallback: function (row, data) {
          var r = $(row);
          if (data.__styles) {
            for (var nm in data.__styles) {
              if (data.__styles.hasOwnProperty(nm)) {
                if (nm[0] === '@') {
                  r.css(nm.substr(1), data.__styles[nm]);
                } else {
                  if (data.__styles[nm]) {
                    r.addClass(nm);
                  } else {
                    r.removeClass(nm);
                  }
                }
              }
            }
          }
        }
      }, defaults, this.options.dt);
    },

    onPreLoad: function (e, settings, data) {
      this.resetSelection();
      this.triggerRowSelect();
      this.$loading.show();
      this.trackLoader();
    },

    onLoad: function (e, settings, json, xhr) {
      if (json && json.data) {
        json.data = this.deleteEmptyRows(json.data);
        /*
        if (json.data.length === 0) {
          var info = this.dt.page.info();
          if (info.page < info.pages - 1) {
            this.dt.page('next').draw('page');
            return;
          }
        }
         */
        this.assignUndefinedData(settings.aoColumns, json.data);
      }
      if (this.insertedRows.length) {
        var info = this.dt.page.info();
        if (json) {
          var mapData = {};
          for (var i = 0; i < json.data.length; i++) {
            mapData[json.data[i]._id] = true;
            if (this.inserted[json.data[i]._id]) {
              this.insertedRows.splice(this.insertedRows.indexOf(this.inserted[json.data[i]._id]), 1);
              delete this.inserted[json.data[i]._id];
            }
          }
        }
      }

      if (this.insertedRows.length) {
        if (json) {
          var end = info.start + info.length;
          if (end > json.recordsFiltered) {
            var start, stop;
            stop = end - json.recordsFiltered + 1;
            if (stop > this.insertedRows.length) {
              stop = this.insertedRows.length;
            }
            start = info.start - json.recordsFiltered;
            if (start < 0) start = 0;
            for (var j = start; j < stop; j++) {
              if (!mapData[this.insertedRows[j]._id]) {
                json.data.push(this.insertedRows[j]);
              }
            }
          }
          json.recordsTotal = json.recordsTotal + this.insertedRows.length;
          json.recordsFiltered = json.recordsFiltered + this.insertedRows.length;
        }
      }
      if (json && json.permissions) {
        if (!json.permissions.read) {
          this.$controls.remove();
          messageCallout.error(__('js.listManager.accessDenied'));
        }
        if (!json.permissions.use) {
          this.$controls.find('.create').remove();
        }
        if (!json.permissions.delete) {
          this.$controls.find('.delete').remove();
        }
      }
      this.$loading.hide();
    },

    errorDataTable: function (event, settings, techNote, message) {
      messageCallout.error(__('js.listManager.errData'));
      console.error(message);
      processAjaxError({status: 401});
    },

    // CONTROLS

    reload: function (reset, id) {
      if (this.options.url && this.options.url.list) {
        reset = reset === true ? true : false;
        this.dt.ajax.reload(function (data) {
          this.triggerRowSelect();
        }.bind(this), reset);
      } else {
        this.dt.draw();
      }
    },

    select: function () {
      var self = this;
      var selected = this.dt.rows('.selected').data();
      if (!self.options.master || !self.options.master.backRef) {
        parent.imodal.setParams('result', selected);
        return parent.imodal.close();
      }
      var confirmations = [];
      for (var i = 0; i < selected.length; ++i) {
        var data = selected[i];
        if (data[self.options.master.backRef]) {
          var msg = __('js.listManager.breakRef', {
            cap: self.options.master.backRefCaption,
            href: self.options.master.backRefUrlPattern.replace(':id', data[self.options.master.backRef])
          });
          if (data[self.options.master.backRef + '_ref']) {
            msg = __('js.listManager.breakRefRef', {
              cap: self.options.master.backRefCaption,
              href: self.options.master.backRefUrlPattern.replace(':id', data[self.options.master.backRef]),
              name: data[self.options.master.backRef + '_ref'].__string
            });
          }
          confirmations.push('<div title="' + __('js.listManager.warn') + '">' + msg + '</div>');
        }
      }
      this.createSelectConfirmation(confirmations, selected);
    },

    createSelectConfirmation: function (confirmations, selected) {
      if (!confirmations.length) {
        parent.imodal.setParams('result', selected);
        return parent.imodal.close();
      }
      var $dlg = $(confirmations.pop());
      $(document.body).append($dlg);
      $dlg.dialog({
        modal: true,
        resizable: false,
        width: 400,
        buttons: {
          [__('js.listManager.yes')]: function() {
            setTimeout(function () {
              this.createSelectConfirmation(confirmations, selected);
            }.bind(this, 1000));
            $dlg.dialog("close");
            $dlg.remove();
          }.bind(this),
          [__('js.listManager.no')]: function() {
            $dlg.dialog("close");
            $dlg.remove();
          }
        }
      });
    },

    createEvent: function () {
      var id;
      var changes = [];
      var rowDelta = 0;
      for (id in this.inserted) {
        if (this.inserted.hasOwnProperty(id)) {
          changes.push({action: 'put', id: id});
          rowDelta++;
        }
      }
      for (id in this.removed) {
        if (this.removed.hasOwnProperty(id)) {
          changes.push({action: 'eject', id: id});
          rowDelta--;
        }
      }
      for (id in this.deleted) {
        if (this.deleted.hasOwnProperty(id)) {
          changes.push({action: 'delete', id: id});
          rowDelta--;
        }
      }
      return jQuery.Event("change", {
        changes: changes,
        rowDelta: rowDelta
      });
    },

    onNewItem: function (result) {
      if (result) {
        if (this.options.url && this.options.url.put) {
          $.post(this.options.url.put, {class: result.__class, id: result._id})
            .done(this.reload.bind(this))
            .fail(function (xhr) {
              messageCallout.error(xhr.responseText || __('js.listManager.itemErr'));
              console.error(xhr);
            })
            .fail(processAjaxError);
        } else {
          if (this.options.deffered) {
            if (result.hasOwnProperty('length')) {
              for (var i = 0; i < result.length; i++) {
                if (!this.inserted[result[i]._id]) {
                  this.inserted[result[i]._id] = true;
                  this.insertedRows.push(result[i]);
                }
              }
              if (!(this.options.url && this.options.url.list)) {
                this.dt.rows.add(result);
              }
            } else {
              if (!this.inserted[result._id]) {
                this.inserted[result._id] = true;
                this.insertedRows.push(result);
              }
              if (!(this.options.url && this.options.url.list)) {
                this.dt.rows.add([result]);
              }
            }
            //this.$table.trigger(this.createEvent());
          }
          this.dt.draw(false);
        }
        this.$table.trigger(this.createEvent());
      }
    },

    onRemoveItems: function (del) {
      var data = this.dt.rows('.selected').data();
      if (this.options.deffered) {
        for (var i = 0; i < data.length; i++) {
          if (del) {
            this.deleted[data[i]._id] = true;
          } else {
            this.removed[data[i]._id] = true;
          }
          if (this.inserted.hasOwnProperty(data[i]._id)) {
            this.insertedRows.splice(data.indexOf(data[i]), 1);
            delete this.inserted[data[i]._id];
          }
        }
        if (!(this.options.url && this.options.url.list)) {
          this.dt.rows('.selected').remove();
        }
        this.$table.trigger(this.createEvent());
      }
      this.dt.draw();
    },

    add: function () {
      var me = this;
      imodal.off('beforeClose');
      if (this.om && this.om.changed) {
        imodal.post(this.options.url.select + '?' + this.requestParams, {
          updates: this.om.trackedValues
        });
      } else {
        imodal.load(this.options.url.select + '?' + this.requestParams);
      }
      imodal.on('beforeClose', function () {
        me.onNewItem(imodal.getParams('result'));
      });
    },

    recalculateModel: function () {
      imodal.load("http://127.0.0.1:8888/registry/html/recalculationTest.html");
      imodal.off('beforeClose');
      imodal.on('beforeClose', function () {
      }.bind(this));
    },

    create: function () {
      imodal.load(this.getCreateUrl());
      imodal.off('beforeClose');
      imodal.on('beforeClose', function () {
        this.onNewItem(imodal.getParams('result'));
      }.bind(this));
    },

    getCreateUrl: function () {
      var url = this.options.url.create;
      if (this.requestParams) {
        url += url.indexOf('?') > 0 ? this.requestParams : ('?' + this.requestParams);
      }
      return url;
    },

    update: function () {
      var data = this.dt.rows('.selected').data();
      this.updateById(data[0]._id);
    },

    _reorder: function(data) {
      var _this = this;

      $.post(this.options.url.reorder, data)
        .done(function(result){
          _this.reload();
        })
        .fail(function (xhr) {
          messageCallout.error(xhr.$message || __('js.listManager.sortErr'));
          console.error(xhr);
        })
        .fail(processAjaxError);
    },

    reorder: function (up, row) {
      if (!this.options.url.reorder) {
        return;
      }
      var left = this.dt.row('.selected');
      left = this.dt.row(left).node() || row;
      if (!left) {
        return;
      }
      var right = up
        ? this.dt.row($(left).prev()).node()
        : this.dt.row($(left).next()).node();
      if (!right) {
        return;
      }
      var leftData = this.dt.row(left).data();
      var rightData = this.dt.row(right).data();
      this._reorder({items: [
        {class: leftData.__class, id: leftData._id},
        {class: rightData.__class, id: rightData._id}
      ]});
    },

    updateAutoOpen: function (cb) {
      if (!this.options.url.autoOpen) {
        return cb();
      }
      this.updateById(true, this.options.url.autoOpen, cb);
    },

    updateById: function (id, url, cb) {
      if (!id) {
        cb();
        return;
      }
      imodal.off('beforeClose');
      var params = [];
      if (this.options.shortView) {
        params.push('readonly=on&short=on');
      }
      if (this.options.condensedView) {
        params.push('condensed=on');
      }
      params.push('modal=on');
      if (!url) {
        url = this.options.url.update + '/' + encodeURIComponent(id);
      }
      url += '?' + params.join('&');
      imodal.one('loaded', cb);
      imodal.load(url);
      imodal.on('beforeClose', function () {
        this.dt.draw(false);
      }.bind(this));
      imodal.triggerParent('updateById', {id: id});
    },

    toDelete: function (selectedClass) {
      var data = this.dt.rows(selectedClass || '.selected').data();
      var toDelete = [];
      for (var i = 0; i < data.length; i++) {
        toDelete.push({
          class: data[i].__class,
          id: data[i]._id
        });
      }
      return toDelete;
    },

    remove: function (message, items) {
      message = message === undefined ? __('js.listManager.confirmDelItemsCol') : message;
      if (!message || confirm(message)) {
        if (this.options.url && this.options.url.remove) {
          var items = typeof toDelete !== 'undefined' ? toDelete : this.toDelete();
          if (items.length) {
            $.post(this.options.url.remove, {items: items})
              .done(function (xhr) {
                if (xhr.errors && xhr.errors.length) {
                  messageCallout.error(xhr.errors);
                }
                if (!(this.options.url && this.options.url.list)) {
                  this.dt.rows('.selected').remove();
                }
                this.reload();
              }.bind(this))
              .fail(function (xhr) {
                messageCallout.error(xhr.$message || __('js.listManager.itemEr'));
                console.error(xhr);
              })
              .fail(processAjaxError);
          }
        } else {
          this.onRemoveItems(false);
        }
      }
    },

    del: function (message, items) {
      message = message === undefined ? __('js.listManager.confirmDelItems') : message;
      if (!message || confirm(message)) {
        if (this.options.url && this.options.url.do) {
          items = items || this.toDelete();
          if (items.length) {
            this.deleteItems(items);
          }
        } else {
          this.onRemoveItems(true);
        }
      }
    },

    deleteItems: function (items) {
      return $.post(this.options.url.do, {$action: "DELETE", items: items})
        .done(function (xhr) {
          if (xhr.errors && xhr.errors.length) {
            messageCallout.error(xhr.errors);
          }
          if (!(this.options.url && this.options.url.list)) {
            this.dt.rows('.selected').remove();
          }
          this.reload();
        }.bind(this))
        .fail(function (xhr) {
          messageCallout.error(xhr.$message || __('js.listManager.delErr'));
          console.error(xhr);
        })
        .fail(processAjaxError);
    },

    // SELECTION

    resetSelection: function (except) {
      if (this.dt) {
        this.dt.rows('.selected').every(function(){
          $(this.node()).removeClass('selected');
        });
      }
    },

    setSelectable: function () {
      if (!this.options.inlineForm) {
        this.$table.on('click', 'tr', this.clickSelectable.bind(this));
        this.$table.on('dblclick', 'tr', this.dblclickSelectable.bind(this));
      }
    },

    clickSelectable: function (event) {
      var $row = $(event.currentTarget);
      if (!$row.hasClass('group-start')) {
        if (!event.ctrlKey && !this.options.multiSelect) {
          this.resetSelection($row);
        }
        $row.toggleClass('selected');
        this.triggerRowSelect();
      }
    },

    dblclickSelectable: function (event) {
      var $row = $(event.currentTarget);
      if (!$row.hasClass('group-start')) {
        this.resetSelection($row);
        $row.addClass('selected');
        this.triggerRowSelect();
        var $edit = this.$controls.find('.edit');
        var cls = 'global-readonly';
        var $panel = $edit.closest('.' + cls);
        $panel.removeClass(cls);
        if (this.$controls.find('.select').length) {
          this.select();
        } else if ($edit.is(':visible') || (this.options.shortView && this.options.url.update)) {
          $edit.click();
        }
        $panel.addClass(cls);
      }
    },

    triggerRowSelect: function () {
      var sel = this.$table.DataTable().rows('.selected');
      if (sel.length) {
        this.$controls.find('.sorting').show();
      } else {
        this.$controls.find('.sorting').hide();
      }
      this.$table.trigger('list-manager:select', [sel.data()]);
    },

    // DATATABLE RENDER

    getClassNames: function () {
      var names = {};
      for (var type in this.options.fieldTypes) {
        names[type] = 'type_' + this.options.fieldTypes[type];
      }
      return names;
    },

    setDtRenders: function () {
      var types = this.getClassNames();
      for (var i = 0; i < this.options.dt.columns.length; ++i) {
        var col = this.options.dt.columns[i];
        var renderer = this.$table.data(col.name+'_render');
        if (typeof renderer === 'function') {
          col.render = renderer;
        } else {
          switch (col.className) {
            case types.CHECKBOX:
              this.setDtRender('checkbox', col);
              break;
            case types.DATE_PICKER:
              this.setDtRender('date', col);
              break;
            case types.DATETIME_PICKER:
              this.setDtRender('dateTime', col);
              break;
            case types.PERIOD_PICKER:
              this.setDtRender('period', col);
              break;
            case types.FILE:
              this.setDtRender('file', col);
              break;
            case types.IMAGE:
              this.setDtRender('image', col);
              break;
            case types.IMAGE_SCAN:
              this.setDtRender('image', col);
              break;
            case types.ATTACHMENTS:
              this.setDtRender('fileList', col);
              break;
            case types.COLLECTION:
              if (this.options.fieldModes && col.mode === this.options.fieldModes.COLLECTION_HASHTAGS) {
                this.setDtRender('hashtags', col);
              } else {
                this.setDtRender('coll', col);
              }
              break;
            case types.GEO:
              this.setDtRender('geo', col);
              break;
            case types.URL:
              this.setDtRender('url', col);
              break;
            case types.SCHEDULE:
              this.setDtRender('schedule', col);
              break;
            case types.CALENDAR:
              this.setDtRender('calendar', col);
              break;
            default:
              this.setDtRender('text', col);
              break;
          }
        }
      }
    },

    checkboxRender: function (data, type) {
      if (type === 'display') {
        return '<input type="checkbox" class="checkbox" disabled ' + (data === null ? 'indeterminate=true' : data ? 'checked' : '') + '>';
      }
      return data;
    },

    formatDateVal: function (val, col, fmt) {
      if (!val) {
        return '';
      }
      var v = col.parseTimeZone ? moment.parseZone(val) : moment(val);
      return v.isValid() ? v.format(fmt) : '';
    },

    dateRender: function (data, type, col) {
      if (data && type === 'display') {
        return this.formatDateVal(data, col, this.options.locale.dateFormat);
      }
      return data;
    },

    dateTimeRender: function (data, type, col) {
      if (data && type === 'display') {
        return this.formatDateVal(data, col, this.options.locale.dateTimeFormat);
      }
      return data;
    },

    periodRender: function (data, type) {
      if (Array.isArray(data) && data.length === 2 && type === 'display') {
        var v = '';
        if (data[0]) {
          v = v + moment(data[0]).format(this.options.locale.dateFormat);
        }
        v = v + ' - ';
        if (data[1]) {
          v = v + moment(data[1]).format(this.options.locale.dateFormat);
        }
        return v;
      }
      return data;
    },

    fileRender: function (data, type) {
      if (data && type === 'display') {
        return '<a target="_blank" href="' + data.link + '">' + data.name + '</a>';
      }
      return data;
    },

    imageRender: function (data, type) {
      if (data && type === 'display') {
        var thumb = data.link;
        if (data.thumbnails && data.thumbnails.tiny) {
          thumb = data.thumbnails.tiny.link;
        }
        return '<a target="_blank" href="' + data.link + '"><img src="' + thumb + '" alt="' + data.name + '" /></a>';
      }
      return data;
    },

    fileListRender: function (data, type) {
      if (data && data.length && type === 'display') {
        var result = '';
        for (var i = 0; i < data.length; i++) {
          result = result + '<a target="_blank" href="' + data[i].link + '">' + data[i].name + '</a> ';
        }
        return result;
      }
      return data;
    },

    collRender: function (data, type) {
      var result = [];
      if (data && type === 'display') {
        for (var i = 0; i < data.length; i++) {
          result.push(data[i].__string);
        }
      }
      if (result.length === 1) {
        return result.join('');
      }
      if (result.length) {
        return '<ul><li>' + result.join('</li><li>') + '</li></ul>';
      }
      return '';
    },

    hashtagsRender: function (data, type, column) {
      var result = [];
      if (data && type === 'display') {
        for (var i = 0; i < data.length; i++) {
          var filtered;
          for (var j = 0; j < this.options.filter.length; j++) {
            var f = this.options.filter[j];
            if (f.property === column.name
              && f.operation === 10
              && f.nestedConditions.length === 1
              && f.nestedConditions[0].property === column.itemsClassKeyProp
              && f.nestedConditions[0].operation === 9
              && f.nestedConditions[0].value.indexOf(data[i]._id) >= 0) {
              filtered = true;
            }
          }
          result.push('<li class="hashtag' + (filtered ? ' filtered' : '') + '" data-property="' +
            column.name + '" data-items-class-key-property="' +
            column.itemsClassKeyProp + '" data-key="' + data[i]._id + '">' +
            data[i].__string + '</li>');
        }
      }
      if (result.length) {
        return '<ul class="hashtags">' + result.join('') + '</ul>';
      }
      return '';
    },

    geoRender: function (data, type) {
      if (data && type === 'display') {
        return '<span class="text-primary glyphicon glyphicon-map-marker"></span>';
      }
      return data;
    },

    urlRender: function (data, type) {
      if (data && type === 'display') {
        return '<a href="' + data + '" target="_blank">' + data + '</a>';
      }
      return data;
    },

    scheduleRender: function (data, type) {
      if (data && type === 'display') {
        return WorkTime.prototype.format(data);
      }
      return data;
    },

    calendarRender: function (data, type) {
      if (data && type === 'display') {
        return Calendar.prototype.format(data);
      }
      return data;
    },

    textRender: function (data, type) {
      if(type === 'display') {
        return data === null || data === undefined ? '' : String(data);
      }
      return data;
    },

    setDtRender: function (name, column) {
      column.render = function () {
        var content = '';
        if (typeof this[name + 'Render'] === 'function') {
          content = this[name + 'Render'].call(this, arguments[0], arguments[1], column);
        } else {
          content = arguments[0];
        }
        if (arguments[1] === 'display') {
          if (!/<a\s/.test(content)) {
            var params = [];
            if (this.isGlobalReadonly()) {
              params.push('readonly=on');
            } else if (this.options.shortView) {
              params.push('readonly=on&short=on');
            }
            if (this.options.condensedView) {
              params.push('condensed=on');
            }
            content = '<a href="'+ this.options.url.node +'?open='
              + encodeURIComponent(this.options.url.update +'/'+ arguments[2]._id + '?'+ params.join('&'))
              + '" target="_blank" class="hidden-link">'+ (content || '') + '</a>';
          }
        }
        return content;
      }.bind(this);
    },

    deleteEmptyRows: function (data) {
      var result = [];
      if (data instanceof Array) {
        for (var i = 0; i < data.length; i++) {
          if (data[i]._id) {
            result.push(data[i]);
          }
        }
      }
      return result;
    },

    assignUndefinedData: function (cols, data) {
      if (cols instanceof Array && data instanceof Array) {
        for (var i = 0; i < data.length; ++i) {
          var item = data[i];
          for (var j = 0; j < cols.length; ++j) {
            if (item[cols[j].name] === undefined) {
              item[cols[j].name] = null;
            }
          }
        }
      }
    }
  };

  //
  // ATTR LIST MANAGER
  //

  window.AttrListManager = function ($group, onLoadCallback) {
    this.$group = $group;
    this.prop = $group.data('prop');
    this.$form = this.$group.closest('form');
    this.objectManager = this.$form.data('manager');
    this.$attr = this.$group.find('.attr-value');
    this.$group.data('listManager', this);
    this.onLoadCallback = onLoadCallback;
    ListManager.call(this, $group.find('.table'));
    if (this.$table) {
      this.$table.on('change', function (event) {
        this.$group.attr('length', parseInt(this.$group.attr('length')) + event.rowDelta);
        this.$attr.val(JSON.stringify(event.changes)).change();
      }.bind(this));
    }
  };

  $.extend(AttrListManager.prototype, ListManager.prototype, {
    constructor: AttrListManager,

    init: function () {
      if (this.options.dt.data) {
        return this.initList();
      }
      addAsyncSerialHandler(this.initList.bind(this));
    },

    initList: function (nextCallback) {
      try {
        var _this = this;

        this.setDtRenders();
        this.prepareDtOptions();
        this.dt = this.$table.DataTable(this.getDtOptions());
        this.commandManager = new AttrListCommandManager(this.prop.commands, this.$controls.find('.command'), this.$table, this.dt);

        var $tabPane = this.$table.closest('.tab-pane');

        this.$table.on('preXhr.dt', function (e, settings, data) {
          this.onPreLoad(e, settings, data);
        }.bind(this));

        this.$table.on('xhr.dt', function (e, settings, json, xhr) {
          if (this.isGlobalReadonly() && !json.recordsTotal) {
            this.$group.hide();
          }
          this.onLoad(e, settings, json, xhr);
          if(json) {
            this.$group.attr('length', json.recordsTotal);
          }
          if (typeof this.onLoadCallback === "function") {
            this.onLoadCallback.call(this, e, settings, json, xhr);
          }
          nextCallback && nextCallback();
          nextCallback = null;
        }.bind(this));

        this.$table.on('draw.dt', function () {
          this.triggerRowSelect();
          customizeDatatable(this);
        }.bind(this));

        this.$table.on('init.dt', function (event) {
        }.bind(this));

        if (this.options.dt.reorderable && this.options.dt.rowReorder) {
          this.$table.on('row-reorder.dt', function (e, items, edit) {
            var diff = [];
            var left, right, i;
            for (i = 0; i < items.length; i++) {
              left = _this.dt.row(items[i].newPosition).data();
              right = _this.dt.row(items[i].node).data();
              left = {class: left.__class, id: left._id};
              right = {class: right.__class, id: right._id};
              diff.push({left: left, right: right});
            }
            if (diff.length) {
              _this._reorder({diff: diff});
            }
          });
        }

        var $col = this.$table.closest('.dataTables_wrapper').find('.dt-filter-col');
        if ($col.find('.dataTables_filter').length === 0) {
          $col.append(this.$controls);
        }
        customizeDatatable(this);
        this.inlineForm = this.options.inlineForm ? new AttrInlineForm(this) : null;
        this.$group.removeClass('loading');
        this.initHiddenLinks();
      } catch (err) {
        messageCallout.error(__('js.listManager.initColErr', {cap: this.prop.caption}));
        console.error(err);
        nextCallback && nextCallback();
      }
    },

    getDtOptions: function (defaults) {
      if (this.options.dt.dragable === true) {
        this.options.dt.rowReorder = {update: false};
      }
      return ListManager.prototype.getDtOptions.call(this, $.extend({}, defaults, {
        createdRow: function (row, data, index) {
          $(row).data('id', data.id);
      }}));
    }
  });

  //

  ListManager.init();

})();
