/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('react')) :
  typeof define === 'function' && define.amd ? define(['exports', 'react'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.LucideReact = {}, global.react));
})(this, (function (exports, react) { 'use strict';

  const toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  const mergeClasses = (...classes) => classes.filter((className, index, array) => {
    return Boolean(className) && array.indexOf(className) === index;
  }).join(" ");

  var defaultAttributes = {
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  };

  const Icon = react.forwardRef(
    ({
      color = "currentColor",
      size = 24,
      strokeWidth = 2,
      absoluteStrokeWidth,
      className = "",
      children,
      iconNode,
      ...rest
    }, ref) => {
      return react.createElement(
        "svg",
        {
          ref,
          ...defaultAttributes,
          width: size,
          height: size,
          stroke: color,
          strokeWidth: absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
          className: mergeClasses("lucide", className),
          ...rest
        },
        [
          ...iconNode.map(([tag, attrs]) => react.createElement(tag, attrs)),
          ...Array.isArray(children) ? children : [children]
        ]
      );
    }
  );

  const createLucideIcon = (iconName, iconNode) => {
    const Component = react.forwardRef(
      ({ className, ...props }, ref) => react.createElement(Icon, {
        ref,
        iconNode,
        className: mergeClasses(`lucide-${toKebabCase(iconName)}`, className),
        ...props
      })
    );
    Component.displayName = `${iconName}`;
    return Component;
  };

  const CircleAlert = createLucideIcon("CircleAlert", [
    ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
    ["line", { x1: "12", x2: "12", y1: "8", y2: "12", key: "1pkeuh" }],
    ["line", { x1: "12", x2: "12.01", y1: "16", y2: "16", key: "4dfq90" }]
  ]);

  const ChevronRight = createLucideIcon("ChevronRight", [
    ["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]
  ]);

  const Loader = createLucideIcon("Loader", [
    ["path", { d: "M12 2v4", key: "3427ic" }],
    ["path", { d: "m16.2 7.8 2.9-2.9", key: "r700ao" }],
    ["path", { d: "M18 12h4", key: "wj9ykh" }],
    ["path", { d: "m16.2 16.2 2.9 2.9", key: "1bxg5t" }],
    ["path", { d: "M12 18v4", key: "jadmvz" }],
    ["path", { d: "m4.9 19.1 2.9-2.9", key: "bwix9q" }],
    ["path", { d: "M2 12h4", key: "j09sii" }],
    ["path", { d: "m4.9 4.9 2.9 2.9", key: "giyufr" }]
  ]);

  const BookOpen = createLucideIcon("BookOpen", [
    ["path", { d: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z", key: "vv98re" }],
    ["path", { d: "M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z", key: "1cyq3y" }]
  ]);

  const Shield = createLucideIcon("Shield", [
    [
      "path",
      {
        d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
        key: "oel41y"
      }
    ]
  ]);

  const Zap = createLucideIcon("Zap", [
    [
      "path",
      {
        d: "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",
        key: "1xq2db"
      }
    ]
  ]);

  const User = createLucideIcon("User", [
    ["path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", key: "975kel" }],
    ["circle", { cx: "12", cy: "7", r: "4", key: "17ys0d" }]
  ]);

  const Menu = createLucideIcon("Menu", [
    ["line", { x1: "4", x2: "20", y1: "12", y2: "12", key: "1e0a9i" }],
    ["line", { x1: "4", x2: "20", y1: "6", y2: "6", key: "1owob3" }],
    ["line", { x1: "4", x2: "20", y1: "18", y2: "18", key: "yk5zj1" }]
  ]);

  const X = createLucideIcon("X", [
    ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
    ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
  ]);

  const Check = createLucideIcon("Check", [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]]);

  const RefreshCw = createLucideIcon("RefreshCw", [
    ["path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8", key: "v9h5vc" }],
    ["path", { d: "M21 3v5h-5", key: "1q7to0" }],
    ["path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16", key: "3uifl3" }],
    ["path", { d: "M8 16H3v5", key: "1cv678" }]
  ]);

  const Globe = createLucideIcon("Globe", [
    ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
    ["path", { d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20", key: "13o1zl" }],
    ["path", { d: "M2 12h20", key: "9i4pu4" }]
  ]);

  const Briefcase = createLucideIcon("Briefcase", [
    ["path", { d: "M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16", key: "jecpp" }],
    ["rect", { width: "20", height: "14", x: "2", y: "6", rx: "2", key: "i6l2r4" }]
  ]);

  const Star = createLucideIcon("Star", [
    [
      "polygon",
      {
        points: "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2",
        key: "8f66p6"
      }
    ]
  ]);

  const Eye = createLucideIcon("Eye", [
    ["path", { d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z", key: "rwhkz3" }],
    ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
  ]);

  const Info = createLucideIcon("Info", [
    ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
    ["path", { d: "M12 16v-4", key: "1dtifu" }],
    ["path", { d: "M12 8h.01", key: "e9boi3" }]
  ]);

  const Trash2 = createLucideIcon("Trash2", [
    ["path", { d: "M3 6h18", key: "d0wm0j" }],
    ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", key: "4alrt4" }],
    ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", key: "v07s0e" }],
    ["line", { x1: "10", x2: "10", y1: "11", y2: "17", key: "1uufr5" }],
    ["line", { x1: "14", x2: "14", y1: "11", y2: "17", key: "xtxkd" }]
  ]);

  const PanelLeft = createLucideIcon("PanelLeft", [
    ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "afitv7" }],
    ["path", { d: "M9 3v18", key: "fh3hqa" }]
  ]);

  const Dice3 = createLucideIcon("Dice3", [
    ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2", key: "1m3agn" }],
    ["path", { d: "M16 8h.01", key: "cr5u4v" }],
    ["path", { d: "M12 12h.01", key: "1mp3jc" }],
    ["path", { d: "M8 16h.01", key: "18s6g9" }]
  ]);

  exports.Icon = Icon;
  exports.createLucideIcon = createLucideIcon;
  exports.AlertCircle = CircleAlert;
  exports.ChevronRight = ChevronRight;
  exports.Loader = Loader;
  exports.BookOpen = BookOpen;
  exports.Shield = Shield;
  exports.Zap = Zap;
  exports.User = User;
  exports.Menu = Menu;
  exports.X = X;
  exports.Check = Check;
  exports.RefreshCw = RefreshCw;
  exports.Globe = Globe;
  exports.Briefcase = Briefcase;
  exports.Star = Star;
  exports.Eye = Eye;
  exports.Info = Info;
  exports.Trash2 = Trash2;
  exports.PanelLeft = PanelLeft;
  exports.Dice3 = Dice3;

}));
