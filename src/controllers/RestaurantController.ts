import { Request, Response } from "express";
import Restaurant from "../models/restaurant";

const getRestaurant = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.params.restaurantId;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: "restaurant not found" });
    }

    res.json(restaurant);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "something went wrong" });
  }
};

const searchRestaurant = async (req: Request, res: Response) => {
  try {
    const city = req.params.city;
    //从查询字符串中获取搜索词，如果没有提供则默认为空字符串
    const searchQuery = (req.query.searchQuery as string) || "";
    const selectedCuisines = (req.query.selectedCuisines as string) || "";
    const sortOption = (req.query.sortOption as string) || "lastUpdated";
    const page = parseInt(req.query.page as string) || 1;

    //创建一个空的 MongoDB 查询对象
    let query: any = {};
    // city 是用户输入的城市名称。"i" 参数表示对大小写不敏感
    query["city"] = new RegExp(city, "i");
    const cityCheck = await Restaurant.countDocuments(query);
    if (cityCheck === 0) {
      return res.status(404).json({
        data: [],
        pagination: {
          total: 0,
          page: 1,
          pages: 1,
        },
      });
    }

    if (selectedCuisines) {
      const cuisinesArray = selectedCuisines
        .split(",")//selectedCuisines 字符串拆分成一个菜系名称数组
        .map((cuisine) => new RegExp(cuisine, "i"));

      query["cuisines"] = { $all: cuisinesArray };//确保查询结果同时包含用户选择的所有菜系
    }

    if (searchQuery) {
      const searchRegex = new RegExp(searchQuery, "i");
      query["$or"] = [
        { restaurantName: searchRegex },//查找餐厅名称中包含搜索查询的文档
        { cuisines: { $in: [searchRegex] } },//菜系中至少包含了一个与搜索查询匹配的值
      ];
    }

    const pageSize = 10;
    const skip = (page - 1) * pageSize; //计算跳过的文档数量，用于分页查询

    // sortOption = "lastUpdated"
    const restaurants = await Restaurant.find(query)
      .sort({ [sortOption]: 1 })//使用 sort() 方法对查询结果进行排序。sortOption 是一个字符串，表示排序的字段。在这里，它的值是 "lastUpdated"，即根据最后更新时间来排序。1 表示升序排列，即最新的餐厅排在前面
      .skip(skip)//跳过前面指定数量的结果,根据当前页数计算得出的跳过数量，用于实现分页功能
      .limit(pageSize)//限制查询结果返回的数量，即每页显示的餐厅数量
      .lean();//将查询结果转换为普通 JavaScript 对象

    //计算满足给定查询条件的文档数量
    const total = await Restaurant.countDocuments(query);

    const response = {
      data: restaurants,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / pageSize),
      },
    };

    res.json(response);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export default {
  getRestaurant,
  searchRestaurant,
};