"use client";

import * as React from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { cn } from "@/lib/utils";

const DropdownMenu = (props: MenuPrimitive.Root.Props) => <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
const DropdownMenuTrigger = (props: MenuPrimitive.Trigger.Props) => <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;

function DropdownMenuContent({ align = "end", side = "bottom", sideOffset = 4, className, ...props }: MenuPrimitive.Popup.Props & Pick<MenuPrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
  return <MenuPrimitive.Portal><MenuPrimitive.Positioner className="z-[70] outline-none" align={align} side={side} sideOffset={sideOffset}><MenuPrimitive.Popup data-slot="dropdown-menu-content" className={cn("min-w-40 rounded-md border bg-white p-1 text-foreground shadow-lg outline-none", className)} {...props} /></MenuPrimitive.Positioner></MenuPrimitive.Portal>;
}

function DropdownMenuItem({ className, destructive, ...props }: MenuPrimitive.Item.Props & { destructive?: boolean }) {
  return <MenuPrimitive.Item data-slot="dropdown-menu-item" className={cn("flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-slate-100 data-[highlighted]:bg-slate-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50", destructive && "text-red-600 focus:bg-red-50 data-[highlighted]:bg-red-50", className)} {...props} />;
}

const DropdownMenuSeparator = ({ className, ...props }: MenuPrimitive.Separator.Props) => <MenuPrimitive.Separator data-slot="dropdown-menu-separator" className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;

export { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger };
