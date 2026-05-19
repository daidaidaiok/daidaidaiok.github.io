'use client'

import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react'
import { clearAllBodyScrollLocks, disableBodyScroll, enableBodyScroll } from 'body-scroll-lock'
import { Fragment, useEffect, useRef, useState } from 'react'
import headerNavLinks from '@/data/headerNavLinks'
import Link from './Link'

const MobileNav = () => {
  const [navShow, setNavShow] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const navRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const navElement = navRef.current

    if (!navElement) {
      return
    }

    try {
      if (navShow) {
        disableBodyScroll(navElement)
      } else {
        enableBodyScroll(navElement)
      }
    } catch (error) {
      console.error('Failed to update body scroll lock:', error)
    }
  }, [navShow])

  useEffect(() => {
    if (!navShow) {
      setExpandedSection(null)
    }
  }, [navShow])

  useEffect(() => {
    return clearAllBodyScrollLocks
  }, [])

  const openNav = () => setNavShow(true)

  const closeNav = () => setNavShow(false)

  const onToggleNav = () => {
    if (navShow) {
      closeNav()
      return
    }

    openNav()
  }

  const toggleSection = (title: string) => {
    setExpandedSection((currentSection) => (currentSection === title ? null : title))
  }

  return (
    <>
      <button aria-label="切换菜单" onClick={onToggleNav} className="sm:hidden">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="hover:text-primary-500 dark:hover:text-primary-400 h-8 w-8 text-gray-900 dark:text-gray-100"
        >
          <path
            fillRule="evenodd"
            d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {mounted && (
        <Transition appear show={navShow} as={Fragment} unmount={false}>
          <Dialog as="div" onClose={closeNav} unmount={false}>
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
              unmount={false}
            >
              <div className="fixed inset-0 z-60 bg-black/25" />
            </TransitionChild>

            <TransitionChild
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="translate-x-full opacity-0"
              enterTo="translate-x-0 opacity-95"
              leave="transition ease-in duration-200 transform"
              leaveFrom="translate-x-0 opacity-95"
              leaveTo="translate-x-full opacity-0"
              unmount={false}
            >
              <DialogPanel className="fixed top-0 left-0 z-70 h-full w-full bg-white/95 duration-300 dark:bg-gray-950/98">
                <nav
                  ref={navRef}
                  className="mt-8 flex h-full basis-0 flex-col items-start overflow-y-auto pt-2 pl-12 text-left"
                >
                  {headerNavLinks.map((link) =>
                    link.items?.length ? (
                      <div key={link.title} className="mb-6 w-full">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between py-2 pr-4 text-left text-2xl font-bold tracking-widest text-gray-900 dark:text-gray-100"
                          aria-expanded={expandedSection === link.title}
                          aria-controls={`mobile-submenu-${link.title}`}
                          onClick={() => toggleSection(link.title)}
                        >
                          <span>{link.title}</span>
                          <svg
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className={`h-5 w-5 transition-transform duration-200 ${
                              expandedSection === link.title ? 'rotate-180' : ''
                            }`}
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                        <div
                          id={`mobile-submenu-${link.title}`}
                          className={`grid overflow-hidden transition-all duration-200 ease-out ${
                            expandedSection === link.title
                              ? 'mt-3 grid-rows-[1fr] opacity-100'
                              : 'grid-rows-[0fr] opacity-0'
                          }`}
                        >
                          <div className="min-h-0 overflow-hidden">
                            <div className="border-l border-gray-300/70 pl-4 dark:border-gray-700/70">
                              {link.items.map((item) => (
                                <Link
                                  key={item.href}
                                  href={item.href}
                                  className="mb-3 block py-2 pr-4 text-lg font-semibold text-gray-700 outline outline-0 transition hover:text-gray-950 dark:text-gray-200 dark:hover:text-white"
                                  onClick={closeNav}
                                >
                                  <div>{item.title}</div>
                                  {item.description ? (
                                    <div className="mt-1 max-w-xs text-sm font-normal tracking-normal text-gray-500 dark:text-gray-400">
                                      {item.description}
                                    </div>
                                  ) : null}
                                </Link>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Link
                        key={link.title}
                        href={link.href!}
                        className="hover:text-primary-500 dark:hover:text-primary-400 mb-4 block py-2 pr-4 text-2xl font-bold tracking-widest text-gray-900 outline outline-0 dark:text-gray-100"
                        onClick={closeNav}
                      >
                        {link.title}
                      </Link>
                    )
                  )}
                </nav>

                <button
                  className="hover:text-primary-500 dark:hover:text-primary-400 fixed top-7 right-4 z-80 h-16 w-16 p-4 text-gray-900 dark:text-gray-100"
                  aria-label="切换菜单"
                  onClick={onToggleNav}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </DialogPanel>
            </TransitionChild>
          </Dialog>
        </Transition>
      )}
    </>
  )
}

export default MobileNav
