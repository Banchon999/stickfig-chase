"""Shot F (aerial) for the chase long take — rendered with ManimGX.

Starts on a full-frame fog plate (#1B2033) so it joins the 2D crane-up invisibly,
then reveals the night city from above while street lamps die behind the runner,
the whole city goes dark and two red eyes open over it.
"""

import random

import numpy as np

import manimgx as m

FOG = "#1B2033"
DUR = 3.0  # seconds, 90 frames @30


def smooth(x: float) -> float:
    x = min(1.0, max(0.0, x))
    return x * x * (3 - 2 * x)


def seg(t: float, a: float, b: float) -> float:
    return smooth((t - a) / (b - a))


class Aerial(m.ThreeDScene):
    def construct(self) -> None:
        self.camera.background_color = m.ManimColor("#070A18")
        self.set_camera_orientation(phi=12 * m.DEGREES, theta=-90 * m.DEGREES, zoom=0.62, frame_center=[0.3, 0, 0])
        rng = random.Random(7)

        ground = m.Square(side_length=44, fill_color="#10142A", fill_opacity=1, stroke_width=0)
        main = m.Rectangle(width=44, height=0.55, fill_color="#1E2440", fill_opacity=1, stroke_width=0).shift(0.005 * m.OUT)
        cross = m.VGroup(
            *[
                m.Rectangle(width=0.4, height=44, fill_color="#1A2038", fill_opacity=1, stroke_width=0).move_to([x, 0, 0.004])
                for x in (-8.0, -4.8, -1.6, 1.6, 4.8, 8.0)
            ]
        )
        self.add(ground, cross, main)

        # buildings (blocks either side of the main street)
        palette = ["#232A47", "#283052", "#2E365C", "#1F2641"]
        lit_roofs = []
        buildings = m.VGroup()
        for gx in np.arange(-10.4, 10.5, 0.8):
            for gy in list(np.arange(0.75, 11.0, 0.8)) + list(np.arange(-0.75, -11.0, -0.8)):
                if any(abs(gx - cx) < 0.45 for cx in (-8.0, -4.8, -1.6, 1.6, 4.8, 8.0)):
                    continue
                h = rng.uniform(0.25, 1.6)
                b = m.Prism(dimensions=[0.62, 0.62, h], fill_color=rng.choice(palette), fill_opacity=1, stroke_width=0)
                b.move_to([gx, gy, h / 2])
                buildings.add(b)
                if rng.random() < 0.45:
                    sq = m.Square(side_length=0.22, fill_color="#FFD27A", fill_opacity=0.9, stroke_width=0)
                    sq.move_to([gx + rng.uniform(-0.12, 0.12), gy + rng.uniform(-0.12, 0.12), h + 0.01])
                    lit_roofs.append(sq)
        base_cols = [b.get_fill_color() for b in buildings]
        self.add(buildings, *lit_roofs)

        # street lamps along the main street, both sides
        lamps = []
        for x in np.arange(-10.5, 10.6, 0.7):
            for y in (0.36, -0.36):
                pool = m.Circle(radius=0.32, fill_color="#FFB347", fill_opacity=0.28, stroke_width=0).move_to([x, y * 0.6, 0.01])
                bulb = m.Dot3D(point=[x, y, 0.12], radius=0.045, color="#FFC46B")
                lamps.append((x, pool, bulb))
                self.add(pool, bulb)

        runner_glow = m.Circle(radius=0.22, fill_color="#F2C14E", fill_opacity=0.35, stroke_width=0)
        runner = m.Dot3D(point=[0, 0, 0.06], radius=0.07, color="#F2C14E")
        shadow = m.Circle(radius=0.34, fill_color="#000000", fill_opacity=0.85, stroke_width=0)
        self.add(runner_glow, shadow, runner)

        # eyes above the rooftops (open late)
        eyes = []
        for ex in (-2.2, 2.2):
            glow = m.Ellipse(width=4.6, height=0.05, fill_color="#FF2D2D", fill_opacity=0.25, stroke_width=0)
            eye = m.Ellipse(width=3.8, height=0.04, fill_color="#FF2D2D", fill_opacity=1, stroke_width=0)
            pupil = m.Ellipse(width=0.34, height=0.04, fill_color="#07070F", fill_opacity=1, stroke_width=0)
            for mob in (glow, eye, pupil):
                mob.move_to([0.6 + ex, -0.6, 2.0])
            eyes.append((glow, eye, pupil))
            self.add(glow, eye, pupil)

        fog = m.Rectangle(width=30, height=30, fill_color=FOG, fill_opacity=1, stroke_width=0)
        self.add_fixed_in_frame_mobjects(fog)

        state = {"blackout": -1.0}
        t = m.ValueTracker(0.0)
        cam = self.camera

        def runner_x(s: float) -> float:
            return -2.6 + 4.8 * s / DUR

        def creature_x(s: float) -> float:
            return runner_x(s) - 1.4 + 0.6 * seg(s, 0.8, 2.2)

        def update(_: m.Mobject) -> None:
            s = t.get_value()
            # camera: tilt from near top-down to 45°, slow orbit, gentle push
            cam.phi_tracker.set_value((12 + 33 * seg(s, 0.2, 3.0)) * m.DEGREES)
            cam.theta_tracker.set_value((-90 + 22 * seg(s, 0.0, 3.0)) * m.DEGREES)
            cam.zoom_tracker.set_value(0.62 + 0.16 * seg(s, 0.3, 3.0))
            # fog clears
            fog.set_fill(opacity=1 - seg(s, 0.0, 0.65))
            # actors
            rx = runner_x(s)
            runner.move_to([rx, 0, 0.06])
            runner_glow.move_to([rx, 0, 0.012])
            cx = creature_x(s)
            shadow.move_to([cx, 0, 0.013])
            shadow.width = 0.68 + 0.5 * seg(s, 0.8, 2.0)
            # lamps die as the darkness passes, then the whole city at 1.8s
            blackout = seg(s, 1.75, 1.95)
            for lx, pool, bulb in lamps:
                on = 0.0 if lx < cx + 0.2 else 1.0
                on *= 1 - blackout
                pool.set_fill(opacity=0.28 * on)
                bulb.set_fill(m.ManimColor("#FFC46B") if on > 0.5 else m.ManimColor("#151826"))
            if blackout > 0 and state["blackout"] != blackout:
                dark = m.ManimColor("#0B0E1C")
                for bld, c in zip(buildings, base_cols):
                    bld.set_fill(m.interpolate_color(c, dark, blackout))
                state["blackout"] = blackout
            for sq in lit_roofs:
                sq.set_fill(opacity=0.9 * (1 - blackout))
            runner_glow.set_fill(opacity=0.35 * (1 - 0.6 * blackout))
            # eyes open 2.0 → 2.8s
            open_ = seg(s, 2.0, 2.75)
            for glow, eye, pupil in eyes:
                eye.stretch_to_fit_height(max(0.03, 1.6 * open_))
                glow.stretch_to_fit_height(max(0.04, 2.2 * open_))
                glow.set_fill(opacity=0.25 * open_)
                pupil.stretch_to_fit_height(max(0.03, 1.45 * open_))
                eye.set_fill(opacity=min(1.0, open_ * 3))
                pupil.set_fill(opacity=min(1.0, open_ * 3))

        driver = m.VMobject()
        driver.add_updater(update)
        self.add(driver)
        update(driver)
        self.play(t.animate.set_value(DUR), run_time=DUR, rate_func=m.linear)
