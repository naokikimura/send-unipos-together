export interface UniposMember {
  id: string;
  uname: string;
  display_name: string;
  picture_url: string;
  pocket?: { available_point: number };
}

export interface UniposProfile {
  member: UniposMember;
}
