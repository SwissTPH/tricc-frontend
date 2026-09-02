import React, { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Avatar,
  Grid,
  Alert,
  Switch,
  FormControlLabel,
} from '@mui/material'
import { Save as SaveIcon, Edit as EditIcon, Person as PersonIcon } from '@mui/icons-material'
import { User } from '../types'

const UserAccount: React.FC = () => {
  const [user, setUser] = useState<User>({
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    role: 'author',
  })

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const handleEdit = () => {
    setIsEditing(true)
    setFormData({
      name: user.name,
      email: user.email,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
  }

  const handleSave = () => {
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      alert('Passwords do not match')
      return
    }

    setUser((prev) => ({
      ...prev,
      name: formData.name,
      email: formData.email,
    }))

    setIsEditing(false)
    console.log('User updated:', formData)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFormData({
      name: user.name,
      email: user.email,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
  }

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <Box sx={{ p: 3, flexGrow: 1, overflow: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        User Account
      </Typography>

      <Grid container spacing={3}>
        {/* Profile Information */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant="h6">Profile Information</Typography>
                {!isEditing && (
                  <Button variant="outlined" startIcon={<EditIcon />} onClick={handleEdit}>
                    Edit
                  </Button>
                )}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ width: 64, height: 64, mr: 2 }}>
                  <PersonIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Box>
                  <Typography variant="h6">{user.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.email}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Role: {user.role}
                  </Typography>
                </Box>
              </Box>

              {isEditing ? (
                <Box>
                  <TextField
                    fullWidth
                    label="Full Name"
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    sx={{ mb: 2 }}
                  />

                  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Button variant="contained" onClick={handleSave}>
                      Save Changes
                    </Button>
                    <Button variant="outlined" onClick={handleCancel}>
                      Cancel
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Name:</strong> {user.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Email:</strong> {user.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Role:</strong> {user.role}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Change Password */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Change Password
              </Typography>

              <TextField
                fullWidth
                label="Current Password"
                type="password"
                value={formData.currentPassword}
                onChange={(e) => handleFieldChange('currentPassword', e.target.value)}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="New Password"
                type="password"
                value={formData.newPassword}
                onChange={(e) => handleFieldChange('newPassword', e.target.value)}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Confirm New Password"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                sx={{ mb: 2 }}
              />

              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={!formData.currentPassword || !formData.newPassword}
              >
                Change Password
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Preferences */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Preferences
              </Typography>

              <FormControlLabel control={<Switch defaultChecked />} label="Email notifications" />

              <FormControlLabel
                control={<Switch />}
                label="Auto-save projects"
                sx={{ display: 'block', mt: 1 }}
              />

              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Show tooltips"
                sx={{ display: 'block', mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Account Actions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Account Actions
              </Typography>

              <Alert severity="warning" sx={{ mb: 2 }}>
                These actions are irreversible. Please proceed with caution.
              </Alert>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="outlined" color="error">
                  Export Data
                </Button>
                <Button variant="outlined" color="error">
                  Delete Account
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default UserAccount
