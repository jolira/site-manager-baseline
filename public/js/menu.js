(function ($, _, Backbone, app) {
    "use strict";

    function getValue(object, prop, cb) {
        var value = object[prop];

        if (!value) {
            return cb();
        }

        if (_.isFunction(value)) {
            return value(cb);
        }

        return cb (value);
    }

    var menu = [];

    function open(view) {
        var $menu = view.$(".dropdown-menu");

        menu.forEach(function (item) {
            var $item = $('<li style="display:none">');

            $menu.append($item);

            getValue(item, "title", function(title) {
                if (title) {
                    $item.append('<a href="#">' + title + '</a>');
                    $item.click(function () {
                        getValue(item, "id", function(id) {
                            item.cb(id);
                        });
                    });
                    $item.show();
                }
            });
        });

        // $menu.append('<li class="divider"></li>');

        view.$el.addClass("open");
        return false;
    }

    function close(view) {
        view.$el.removeClass("open");
        view.$(".dropdown-menu > *").remove();
        return false;
    }

    app.addMenu = function (id, title, cb) {
        menu.push({
            id:id,
            title:title,
            cb:cb
        });
    };

    app.initializers.push(function (next) {
        var isOpen = false,
            MenuButton = Backbone.View.extend({
                template:app.getTemplate("script[id='menu']"),
                render:function () {
                    $(this.el).addClass("menu-btn dropdown-toggle").html(this.template({}));
                    return this;
                },
                events:{
                    click:"toggle"
                },
                toggle:function () {
                    if (this.$el.hasClass("open")) {
                        return close(this);
                    }

                    return open(this);
                }
            }),
            button = new MenuButton(),
            rendered = button.render();

        $('html').on('click', function () {
            close(button);
        });

        $("body > header").append(rendered.el);
        return next();
    });
})($, _, Backbone, window["jolira-app"]);
