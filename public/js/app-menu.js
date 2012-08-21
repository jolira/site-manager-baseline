(function ($, _, Backbone, app) {
    "use strict";

    /**
     * Define the menu operator.
     *
     * @type {*}
     */
    app.menu = app.menu || {};

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

    function initButton() {
        var isOpen = false,
            MenuButton = Backbone.View.extend({
                template:app.utils.template("script[id='menu']"),
                render:function () {
                    this.$el.addClass("menu-btn dropdown-toggle").html(this.template({}));

                    if (!app.middle.connected) {
                        this.$el.addClass("disconnected");
                    }

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
            button = new MenuButton();

        app.middle.on("connect", function() {
            button.$el.removeClass("disconnected");
        });
        app.middle.on("disconnect",  function() {
            button.$el.addClass("disconnected");
        });
        $('html').on('click', function () {
            close(button);
        });

        $("body > header").append(button.render().el);

        return button;
    }

    app.starter.$(function (next) {
        var button;

        app.menu.add = app.menu.add || function (id, title, cb) {
            if (!button) {
                button = initButton();
            }

            menu.push({
                id:id,
                title:title,
                cb:cb
            });
        };

        return next();
    });
})($, _, Backbone, window["jolira-app"]);
