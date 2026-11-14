from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
README = ROOT / "README.md"
SITE_FILES = [ROOT / "preview.html", ROOT / "index.html"]


def local_target(link: str):
    if link.startswith(("http://", "https://", "#", "mailto:", "data:")):
        return None
    path = link.split("#", 1)[0].split("?", 1)[0]
    return path or None


class TestRepositoryOrganization(unittest.TestCase):
    def test_readme_markdown_targets_exist(self):
        text = README.read_text(encoding="utf-8")
        for link in re.findall(r"!?\[[^\]]*\]\(([^)]+)\)", text):
            target = local_target(link)
            if target:
                self.assertTrue((ROOT / target).exists(), f"README target missing: {link}")

    def test_readme_html_images_exist(self):
        text = README.read_text(encoding="utf-8")
        for src in re.findall(r'<img[^>]+src="([^"]+)"', text):
            target = local_target(src)
            if target:
                self.assertTrue((ROOT / target).exists(), f"README image missing: {src}")

    def test_all_markdown_targets_exist(self):
        for page in ROOT.rglob("*.md"):
            if ".git" in page.parts:
                continue
            text = page.read_text(encoding="utf-8")
            for link in re.findall(r"!?\[[^\]]*\]\(([^)]+)\)", text):
                target = local_target(link)
                if target:
                    self.assertTrue((page.parent / target).exists(), f"{page.relative_to(ROOT)} target missing: {link}")

    def test_site_references_exist(self):
        for page in SITE_FILES:
            text = page.read_text(encoding="utf-8")
            for attr, link in re.findall(r'(src|href)="([^"]+)"', text):
                target = local_target(link)
                if target:
                    self.assertTrue((ROOT / target).exists(), f"{page.name} {attr} missing: {link}")

    def test_site_uses_the_organized_paths(self):
        text = (ROOT / "preview.html").read_text(encoding="utf-8")
        for path in ("assets/css/site.css", "assets/js/core.js", "assets/js/scene.js"):
            self.assertIn(path, text)

    def test_beginner_guide_heading_and_anchor(self):
        text = README.read_text(encoding="utf-8")
        self.assertIn("## 🌱 Beginner Guide — Read This and You Are a Professional", text)
        self.assertIn("#-beginner-guide--read-this-and-you-are-a-professional", text)
        self.assertIn("You will know more than most interview candidates.", text)

    def test_required_files_exist(self):
        required = [
            "preview.html",
            "index.html",
            ".nojekyll",
            "Makefile",
            ".editorconfig",
            ".gitattributes",
            "assets/css/site.css",
            "assets/js/core.js",
            "assets/js/scene.js",
            "assets/img/social-preview.png",
            "assets/media/demo.gif",
            "python/README.md",
            "python/basic_tracking.py",
            "python/full_tracking_demo.py",
            "python/ble_device.py",
            "python/scan_ble_sensor.py",
            "scripts/verify.sh",
            "tests/test_repo_links.py",
            ".github/dependabot.yml",
            "requirements.txt",
            "LICENSE",
        ]
        for path in required:
            self.assertTrue((ROOT / path).exists(), f"Missing required file: {path}")

    def test_legacy_layout_is_gone(self):
        legacy = [
            "main.py",
            "test.py",
            "orginal.py",
            "github_example.py",
            "device_model.py",
            "control_each_single_point.py",
            "control_each_single_point_with_rotation.py",
            "control_each_single_point_with_rotation_left_right.py",
        ]
        for path in legacy:
            self.assertFalse((ROOT / path).exists(), f"Legacy file still present: {path}")

    def test_no_duplicate_assets(self):
        self.assertFalse((ROOT / "assets/site.css").exists())
        self.assertFalse((ROOT / "assets/core.js").exists())
        self.assertFalse((ROOT / "assets/scene.js").exists())
        self.assertFalse((ROOT / "assets/demo.gif").exists())


if __name__ == "__main__":
    unittest.main()
