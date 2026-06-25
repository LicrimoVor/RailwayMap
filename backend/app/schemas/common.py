from typing import Any

from pydantic import BaseModel, ConfigDict

GeometryJson = dict[str, Any]


class OrmModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)
