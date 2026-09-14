use crate::scanner::filters;
use std::fs;
use std::path::{Path, PathBuf};

const MAX_DEPTH: usize = 3;
const MAX_EXES: usize = 48;

pub fn clean_icon_path(raw: &str) -> Option<PathBuf> {
    let trimmed = raw.trim().trim_matches('"');
    let without_index = trimmed.split(',').next().unwrap_or(trimmed).trim();
    if without_index.is_empty() {
        return None;
    }
    let path = PathBuf::from(without_index);
    if path.extension().and_then(|ext| ext.to_str()).map(|ext| ext.eq_ignore_ascii_case("exe")) != Some(true)
    {
        return None;
    }
    path.exists().then_some(path)
}

pub fn find_primary_executable(install_dir: &Path, preferred_name: Option<&str>) -> Option<PathBuf> {
    if !install_dir.exists() {
        return None;
    }

    let mut exes = Vec::new();
    collect_exes(install_dir, 0, &mut exes);
    if exes.is_empty() {
        return None;
    }

    if let Some(preferred) = preferred_name {
        let needle = sanitize(preferred);
        if let Some(matched) = exes.iter().find(|path| {
            path.file_stem()
                .and_then(|stem| stem.to_str())
                .is_some_and(|stem| sanitize(stem) == needle)
        }) {
            return Some(matched.clone());
        }
    }

    let folder = install_dir
        .file_name()
        .and_then(|name| name.to_str())
        .map(sanitize)
        .unwrap_or_default();

    if !folder.is_empty() {
        if let Some(matched) = exes.iter().find(|path| {
            path.file_stem()
                .and_then(|stem| stem.to_str())
                .is_some_and(|stem| sanitize(stem) == folder)
        }) {
            return Some(matched.clone());
        }
    }

    exes.into_iter()
        .max_by_key(|path| path.metadata().map(|meta| meta.len()).unwrap_or(0))
}

fn collect_exes(dir: &Path, depth: usize, out: &mut Vec<PathBuf>) {
    if depth > MAX_DEPTH || out.len() >= MAX_EXES {
        return;
    }

    let entries = match fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        if out.len() >= MAX_EXES {
            return;
        }

        let path = entry.path();
        let file_type = match entry.file_type() {
            Ok(file_type) => file_type,
            Err(_) => continue,
        };

        if file_type.is_symlink() {
            continue;
        }

        if file_type.is_dir() {
            let name = entry.file_name().to_string_lossy().to_string();
            if filters::should_skip_dir(&name) {
                continue;
            }
            collect_exes(&path, depth + 1, out);
            continue;
        }

        if path
            .extension()
            .and_then(|ext| ext.to_str())
            .is_some_and(|ext| ext.eq_ignore_ascii_case("exe"))
            && !filters::is_excluded_exe(&path)
        {
            out.push(path);
        }
    }
}

fn sanitize(value: &str) -> String {
    value
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric())
        .collect::<String>()
        .to_ascii_lowercase()
}
