# MyBBBridge

A comprehensive VSCode extension for MyBB theme and template development, featuring Git integration and automated cache management. Originally created by Leminaw, extensively enhanced with modern development workflows.

## Key Features

### Template Management
* Smart Template Organization
  - Auto-sorts templates into prefix-based folders (`template_sets/<set_name>/<prefix>/`)
  - Full support for global templates (sid = -2)
  - Intelligent template versioning
  - Handles both template-set-specific and global templates
  - Auto-detects template type and saves to appropriate location

### Style Management
* Advanced CSS Handling
  - Clean organization (`styles/<theme_name>/`)
  - Real-time cache refresh on save
  - Automatic stylesheet creation/updates
  - Built-in error recovery for cache operations
  - Theme-specific stylesheet management

### Development Workflow
* Git Integration
  - Automated deployment via GitHub Actions
  - Intelligent file change detection
  - Maintains directory structure during deployment
  - Branch-aware updates (supports development branches)
  - Automatic backup creation

### Cache System
* Smart Caching
  - Two-stage cache refresh system
  - Fallback mechanisms for failed cache attempts
  - Theme-specific cache management
  - Manual cache control via cacheform.php
  - Detailed cache operation logging

## Installation

### Required Files
1. Extension Files (VSCode)
   - Main extension package
   - Configuration templates
   - Utility scripts

2. Server Files
   - `cacheform.php`: Cache management interface
   - `cachecss.php`: CSS cache handler
   - `update_mybb.php`: Handles uppdating styles and templates with github actions.  CI/CD

### Configuration
Create `.vscode/mbbb.json`:
```json
{
    "database": {
        "host": "localhost",
        "port": 3306,
        "database": "mybb",
        "prefix": "mybb_",
        "user": "root",
        "password": ""
    },
    "mybbVersion": 1860,
    "mybbUrl": "http://localhost",
    "autoUpload": true
}
```

* `database`: This one should be quite self explanatory!

* `mybbVersion`: MyBB version to be used in newly created theme files. Existing files
  will keep their version metadata.

* `mybbUrl`: URL of your MyBB board. Set to `null` or `''` to disable cache refresh
  requests.

* `autoUpload`: If true, MyBBBridge will try to save theme and stylesheets to database
  each time a corresponding file is saved in VSCode.
  *Overrides existing database entries without confirmation!*

### Cache refresh

To be able to ask MyBB for template cache refresh, MyBBBridge requires you to upload
the tiny `cacheform.php` php file of this repository to your web server, at the root of
your MyBB directory. If you don't plan to use cache refresh, you can skip this step and
set `mybbUrl` to `null` in your `mbbb.json` config file.

### Commands

* `MyBBBridge: Create config file`: Create a new config file, allowing you to start
  using MyBBBridge.

* `MyBBBridge: Load MyBB template set from database`: Download and save all templates
  files of a given template set to the `./template_sets/<template_set_name>/` folder.
  *Overrides existing files without confirmation!*

* `MyBBBridge: Load MyBB style from database`: Download and save all stylesheet files
  of a given style to the `./styles/<style_name>/` folder.
  *Overrides existing files without confirmation!*

## Release Notes

### 0.0.1-alpha

Alpha release providing basic download features.

### 0.0.2-alpha

Alpha release with save features.

### 0.0.3-alpha

Alpha release allowing to refresh MyBB stylesheet cache files.

### 0.0.4-alpha

Alpha release improving existing cache functionalities, and allowing a a CI/CD workflow with one additional script - not included in repo.

### 1.0 - Pre-Release

Sorted all templates into folders by prefix name, we adjusted the saving functionality so it will be able to read the new folder structure.  Added global templates.