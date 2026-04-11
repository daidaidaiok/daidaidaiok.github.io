'use client'

import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import headerNavLinks from '@/data/headerNavLinks'
import Link from './Link'

const linkClassName =
  'dark:hover:bg-neo-hover-dark rounded-full px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-white hover:text-black dark:text-gray-200 dark:hover:text-white'

export default function DesktopNav() {
  return (
    <div className="neo-inset no-scrollbar hidden max-w-40 items-center gap-x-1 overflow-x-auto p-1 sm:flex md:max-w-72 lg:max-w-96">
      {headerNavLinks
        .filter((link) => link.href !== '/')
        .map((link) =>
          link.items?.length ? (
            <Menu as="div" className="relative inline-block text-left" key={link.title}>
              <MenuButton
                className={`${linkClassName} inline-flex items-center gap-1.5`}
                aria-label={`${link.title} 菜单`}
              >
                <span>{link.title}</span>
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4 text-gray-500 dark:text-gray-300"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </MenuButton>
              <MenuItems
                anchor={{ to: 'bottom start', gap: '12px' }}
                modal={false}
                className="z-50 w-72 rounded-[28px] border border-white/80 bg-white/95 p-2 shadow-[14px_14px_28px_rgba(169,160,160,0.28),-14px_-14px_28px_rgba(255,255,255,0.8)] backdrop-blur-xl focus:outline-hidden dark:border-white/10 dark:bg-gray-950/95 dark:shadow-[14px_14px_28px_rgba(0,0,0,0.38),-14px_-14px_28px_rgba(47,58,70,0.2)]"
              >
                {link.items.map((item) => (
                  <MenuItem key={item.href}>
                    <Link
                      href={item.href}
                      className="ios-radius block px-4 py-3 transition hover:bg-black/5 dark:hover:bg-white/6"
                    >
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {item.title}
                      </div>
                      {item.description ? (
                        <div className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                          {item.description}
                        </div>
                      ) : null}
                    </Link>
                  </MenuItem>
                ))}
              </MenuItems>
            </Menu>
          ) : (
            <Link key={link.title} href={link.href!} className={linkClassName}>
              {link.title}
            </Link>
          )
        )}
    </div>
  )
}
