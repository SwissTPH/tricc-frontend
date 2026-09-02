import React, { useState } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Tabs,
  Tab,
  Menu,
  MenuItem,
  Avatar,
  Tooltip,
} from '@mui/material'
import {
  Settings as SettingsIcon,
  AccountCircle as AccountIcon,
  Language as LanguageIcon,
  Menu as MenuIcon,
  Add as AddIcon,
  GetApp as ExportIcon,
  Publish as ImportIcon,
} from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'
import { useProject } from '../../hooks/useProject'
import { useRef } from 'react'
import { generateZIPExport } from '../../utils/export-generators'

interface MainLayoutProps {
  children: React.ReactNode
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { currentProject, activities, importProject } = useProject()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleMainMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget)
  }

  const handleMainMenuClose = () => {
    setMenuAnchorEl(null)
  }

  const handleExport = async () => {
    if (!currentProject) return

    try {
      // Generate comprehensive ZIP export
      const zipBlob = await generateZIPExport(currentProject, activities)

      // Create download link
      const url = URL.createObjectURL(zipBlob)
      const exportLink = document.createElement('a')
      exportLink.href = url
      exportLink.download = `${currentProject.title.replace(/\s+/g, '_')}_export.zip`
      exportLink.click()

      // Clean up
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error generating ZIP export:', error)
      alert('Error generating export. Please try again.')
    }

    handleMainMenuClose()
  }

  const handleImport = () => {
    fileInputRef.current?.click()
    handleMainMenuClose()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      try {
        // Check if it's a ZIP file
        if (file.name.endsWith('.zip')) {
          await handleZIPImport(file)
        } else if (file.name.endsWith('.json')) {
          // Fallback for legacy JSON files
          const reader = new FileReader()
          reader.onload = (e) => {
            try {
              const projectData = JSON.parse(e.target?.result as string)
              importProject(projectData)
            } catch (error) {
              console.error('Error parsing imported file:', error)
              alert('Invalid file format. Please select a valid TRICC project file.')
            }
          }
          reader.readAsText(file)
        } else {
          alert('Please select a ZIP file (.zip) or JSON file (.json) for import.')
        }
      } catch (error) {
        console.error('Error importing file:', error)
        alert('Error importing file. Please try again.')
      }
    }
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleZIPImport = async (zipFile: File) => {
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(zipFile)

    // Look for project.json in the ZIP
    const projectJsonFile = zip.file('project.json')
    if (!projectJsonFile) {
      throw new Error('Invalid ZIP file: project.json not found')
    }

    // Parse project data
    const projectDataStr = await projectJsonFile.async('text')
    const projectData = JSON.parse(projectDataStr)

    // Import the project
    importProject(projectData)

    alert('Project imported successfully from ZIP file!')
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    if (newValue === 'settings') {
      navigate('/settings')
    } else if (newValue === 'account') {
      navigate('/account')
    } else if (newValue === 'terminology') {
      navigate('/terminology')
    } else if (newValue.startsWith('activity-')) {
      const activityId = newValue.replace('activity-', '')
      navigate(`/activity/${activityId}`)
    } else {
      navigate('/')
    }
  }

  const getCurrentTabValue = () => {
    if (location.pathname === '/settings') return 'settings'
    if (location.pathname === '/account') return 'account'
    if (location.pathname === '/terminology') return 'terminology'
    if (location.pathname.startsWith('/activity/')) {
      const activityId = location.pathname.split('/')[2]
      // Check if the activity actually exists
      if (activities[activityId]) {
        return `activity-${activityId}`
      } else {
        // If activity doesn't exist, return dashboard (will trigger navigation)
        return 'dashboard'
      }
    }
    return 'dashboard'
  }

  const activityTabs = Object.values(activities).map((activity) => (
    <Tab key={`activity-${activity.id}`} label={activity.name} value={`activity-${activity.id}`} />
  ))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="main menu"
            sx={{ mr: 2 }}
            onClick={handleMainMenuOpen}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            TRICC - {currentProject?.title || 'Untitled Project'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Add New Activity">
              <IconButton color="inherit" onClick={() => navigate('/activity/new')}>
                <AddIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Terminology Server">
              <IconButton color="inherit" onClick={() => navigate('/terminology')}>
                <LanguageIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Project Settings">
              <IconButton color="inherit" onClick={() => navigate('/settings')}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="User Account">
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenuOpen}
                color="inherit"
              >
                <Avatar sx={{ width: 32, height: 32 }}>
                  <AccountIcon />
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>

          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem
              onClick={() => {
                navigate('/account')
                handleMenuClose()
              }}
            >
              Profile
            </MenuItem>
            <MenuItem
              onClick={() => {
                navigate('/settings')
                handleMenuClose()
              }}
            >
              Settings
            </MenuItem>
            <MenuItem onClick={handleMenuClose}>Logout</MenuItem>
          </Menu>

          <Menu
            id="main-menu"
            anchorEl={menuAnchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            open={Boolean(menuAnchorEl)}
            onClose={handleMainMenuClose}
          >
            <MenuItem onClick={handleExport}>
              <ExportIcon sx={{ mr: 1 }} />
              Export Project (ZIP)
            </MenuItem>
            <MenuItem onClick={handleImport}>
              <ImportIcon sx={{ mr: 1 }} />
              Import Project (ZIP)
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={getCurrentTabValue()}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="project tabs"
        >
          <Tab label="Dashboard" value="dashboard" />
          {activityTabs}
        </Tabs>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>{children}</Box>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".zip,.json"
        style={{ display: 'none' }}
      />
    </Box>
  )
}

export default MainLayout
