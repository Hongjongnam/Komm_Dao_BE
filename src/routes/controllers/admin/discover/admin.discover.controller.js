require("dotenv").config();
const { ProjectInfo } = require("../../../../../models/index");
const { Op } = require("sequelize");

exports.projectList = async (req, res) => {
  try {
    const projects = await ProjectInfo.findAll({
      attributes: [
        "pjt_id",
        "pjt_name",
        "website",
        "category",
        "x_link",
        "x_followers",
        "discord_link",
        "discord_members",
        "linkedIn_link",
        "github_link",
        "github_stars",
        "raising_amount",
        "valuation",
        "investors",
        "pjt_grade",
        "pjt_summary",
        "pjt_details",
        "adm_trend",
        "adm_expertise",
        "adm_final_grade",
        "update_date",
        "apply_yn",
      ],
      order: [["update_date", "DESC"]], // 최신 업데이트가 먼저 오도록 정렬
    });

    // 날짜 형식을 가공
    const formattedProjects = projects.map((project) => ({
      ...project.toJSON(),
      update_date: project.update_date
        ? project.update_date.toISOString().split("T")[0]
        : null,
    }));

    res.json(formattedProjects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.addProject = async (req, res) => {
  const {
    pjt_name,
    website,
    category,
    x_link,
    x_followers,
    discord_link,
    discord_members,
    linkedIn_link,
    github_link,
    github_stars,
    github_wkly_comm,
    raising_amount,
    valuation,
    investors,
    pjt_grade,
    pjt_summary,
    pjt_details,
    adm_trend,
    adm_expertise,
    adm_final_grade,
  } = req.body;

  try {
    // 새로운 프로젝트 데이터를 생성
    const newProject = await ProjectInfo.create({
      pjt_name,
      website,
      category,
      x_link,
      x_followers,
      discord_link,
      discord_members,
      linkedIn_link,
      github_link,
      github_stars,
      github_wkly_comm,
      raising_amount,
      valuation,
      investors,
      pjt_grade,
      pjt_summary,
      pjt_details,
      adm_trend,
      adm_expertise,
      adm_final_grade,
      create_date: new Date(), // 현재 날짜로 설정
      update_date: new Date(), // 현재 날짜로 설정
      apply_yn: "N", // 기본값 설정
    });

    res.status(200).json({
      message: "Project created successfully",
      project: newProject,
    });
  } catch (error) {
    console.error("Error adding project:", error);
    res
      .status(500)
      .json({ message: "Failed to add project", error: error.message });
  }
};

// admin.discover.controller.js
exports.deleteProjects = async (req, res) => {
  const { ids } = req.body;

  try {
    await ProjectInfo.destroy({
      where: {
        pjt_id: {
          [Op.in]: ids, // 선택된 ids에 해당하는 데이터만 삭제
        },
      },
    });

    res.status(200).json({ message: "Projects deleted successfully" });
  } catch (error) {
    console.error("Error deleting projects:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.appliedProject = async (req, res) => {
  try {
    const projects = await ProjectInfo.findAll({
      attributes: ["pjt_id", "pjt_name", "apply_yn"],
      where: {
        apply_yn: "Y",
      },
      order: [["update_date", "DESC"]], // 최신 업데이트가 먼저 오도록 정렬
    });

    // 날짜 형식을 가공
    const formattedProjects = projects.map((project) => ({
      ...project.toJSON(),
      update_date: project.update_date
        ? project.update_date.toISOString().split("T")[0]
        : null,
    }));

    res.json(formattedProjects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.projectApply = async (req, res) => {
  const { pjt_id } = req.body;

  try {
    const project = await ProjectInfo.findOne({ where: { pjt_id } });

    if (project) {
      project.apply_yn = "Y";
      project.apply_date = new Date();
      await project.save();
      res.status(200).json({ message: "Apply status updated successfully" });
    } else {
      res.status(404).json({ message: "Project not found" });
    }
  } catch (error) {
    console.error("Error updating apply status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.projectUpdate = async (req, res) => {
  const { pjt_id, ...updateData } = req.body;

  console.log(pjt_id, updateData);
  try {
    const project = await ProjectInfo.findOne({ where: { pjt_id } });

    if (project) {
      // 전달된 필드만 업데이트
      Object.keys(updateData).forEach((key) => {
        project[key] = updateData[key];
      });
      project.update_date = new Date(); // 업데이트 시각을 현재 시각으로 설정
      await project.save();
      res.status(200).json({ message: "Project updated successfully" });
    } else {
      res.status(404).json({ message: "Project not found" });
    }
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
